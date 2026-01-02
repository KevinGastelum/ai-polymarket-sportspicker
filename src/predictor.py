"""
Live Prediction Orchestrator for AI PolyMarket Sports Picker

This module coordinates predictions across all three models:
1. Fetches current sports markets from Polymarket
2. Runs predictions through Historical, Sentiment, and Hybrid models
3. Logs predictions to Supabase
4. Provides CLI and API interface

Usage:
    # Make predictions for current markets
    python src/predictor.py
    
    # Make predictions for specific sport
    python src/predictor.py --sport nba
"""

import os
import json
import logging
import argparse
from typing import Optional
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import our modules
from src.tools.polymarket_client import PolymarketClient, Market
from src.tools.supabase_client import SupabaseClient, Prediction


# =============================================================================
# Model Loaders
# =============================================================================

class ModelLoader:
    """Loads and manages ML models for inference."""
    
    def __init__(self, model_dir: str = "artifacts/models"):
        self.model_dir = Path(model_dir)
        self.historical_model = None
        self.sentiment_model = None
        self.meta_learner = None
        self.scaler_params = None
        self.feature_names = None
        self._use_tf = False
    
    def load_all(self) -> bool:
        """
        Load all models.
        
        Returns:
            True if at least one model loaded successfully
        """
        success = False
        
        # Load feature names and scaler
        try:
            with open("artifacts/prepared_data/feature_names.json", "r") as f:
                self.feature_names = json.load(f)
            with open("artifacts/prepared_data/scaler_params.json", "r") as f:
                self.scaler_params = json.load(f)
            logger.info("Loaded feature names and scaler params")
        except FileNotFoundError:
            logger.warning("Feature names or scaler not found. Using defaults.")
            self.feature_names = []
            self.scaler_params = None
        
        # Load Historical Model
        try:
            import joblib
            self.historical_model = joblib.load(
                self.model_dir / "historical_model.joblib"
            )
            logger.info("Loaded historical model")
            success = True
        except Exception as e:
            logger.warning(f"Could not load historical model: {e}")
        
        # Load Sentiment Model
        try:
            import tensorflow as tf
            self.sentiment_model = tf.keras.models.load_model(
                self.model_dir / "sentiment_model.keras"
            )
            self._use_tf = True
            logger.info("Loaded sentiment model (TensorFlow)")
            success = True
        except Exception as e:
            try:
                import joblib
                self.sentiment_model = joblib.load(
                    self.model_dir / "sentiment_model.joblib"
                )
                self._use_tf = False
                logger.info("Loaded sentiment model (sklearn)")
                success = True
            except Exception as e2:
                logger.warning(f"Could not load sentiment model: {e2}")
        
        # Load Meta-learner
        try:
            import joblib
            self.meta_learner = joblib.load(
                self.model_dir / "hybrid_meta_learner.joblib"
            )
            logger.info("Loaded hybrid meta-learner")
        except Exception as e:
            logger.warning(f"Could not load meta-learner: {e}")
        
        return success
    
    @property
    def models_loaded(self) -> dict:
        """Check which models are loaded."""
        return {
            "historical": self.historical_model is not None,
            "sentiment": self.sentiment_model is not None,
            "hybrid": self.meta_learner is not None,
        }


# =============================================================================
# Feature Extractor
# =============================================================================

class FeatureExtractor:
    """Extracts features from Polymarket markets for prediction."""
    
    SPORT_KEYWORDS = {
        "nba": ["nba", "basketball", "lakers", "celtics", "warriors", "bulls"],
        "nfl": ["nfl", "football", "chiefs", "eagles", "cowboys", "patriots"],
        "mlb": ["mlb", "baseball", "yankees", "dodgers", "red sox", "cubs"],
        "nhl": ["nhl", "hockey", "bruins", "rangers", "penguins", "maple leafs"],
        "mma": ["ufc", "mma", "fight", "bellator"],
        "soccer": ["soccer", "mls", "premier league", "la liga"],
    }
    
    def extract_features(self, market: Market) -> dict:
        """
        Extract ML features from a Polymarket market.
        
        Args:
            market: Market object from Polymarket
            
        Returns:
            Dictionary of features
        """
        # Detect sport
        sport = self._detect_sport(market.question)
        
        # Get prices from tokens (Token is a Pydantic model)
        tokens = market.tokens or []
        yes_price = 0.5
        no_price = 0.5
        
        for token in tokens:
            outcome = getattr(token, 'outcome', '').lower() if hasattr(token, 'outcome') else ''
            price = getattr(token, 'price', None) if hasattr(token, 'price') else None
            
            if outcome == "yes" and price is not None:
                yes_price = float(price)
            elif outcome == "no" and price is not None:
                no_price = float(price)
        
        # Calculate derived features
        price_spread = abs(yes_price - no_price)
        is_home_favorite = yes_price > no_price
        market_edge = yes_price - 0.5
        
        # Create feature dict matching our training data
        features = {
            "market_id": market.condition_id,
            "question": market.question,
            "sport": sport,
            "home_yes_price": yes_price,
            "away_yes_price": no_price,
            "price_spread": price_spread,
            "is_home_favorite": is_home_favorite,
            "market_edge": market_edge,
            # Default values for features we don't have live
            "home_wins": 0,
            "home_losses": 0,
            "away_wins": 0,
            "away_losses": 0,
            "home_win_pct": 0.5,
            "away_win_pct": 0.5,
            "win_pct_diff": 0.0,
        }
        
        return features
    
    def _detect_sport(self, text: str) -> str:
        """Detect sport from market question."""
        text_lower = text.lower()
        
        for sport, keywords in self.SPORT_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                return sport
        
        return "other"
    
    def to_model_input(self, features: dict, feature_names: list) -> np.ndarray:
        """
        Convert features dict to numpy array for model input.
        
        Args:
            features: Feature dictionary
            feature_names: List of feature names in order
            
        Returns:
            Numpy array of features
        """
        # Build feature vector
        values = []
        
        for name in feature_names:
            if name.startswith("sport_"):
                # One-hot encoded sport
                sport = name.replace("sport_", "")
                values.append(1.0 if features.get("sport") == sport else 0.0)
            elif name in features:
                val = features[name]
                if isinstance(val, bool):
                    values.append(1.0 if val else 0.0)
                else:
                    values.append(float(val) if val is not None else 0.0)
            else:
                values.append(0.0)
        
        return np.array(values).reshape(1, -1)


# =============================================================================
# Predictor
# =============================================================================

class SportsPredictor:
    """
    Main predictor class that coordinates all predictions.
    
    Usage:
        predictor = SportsPredictor()
        predictor.initialize()
        
        # Predict all current markets
        predictions = predictor.predict_current_markets()
        
        # Save to Supabase
        predictor.save_predictions(predictions)
    """
    
    def __init__(self):
        self.polymarket = PolymarketClient()
        self.supabase = SupabaseClient()
        self.models = ModelLoader()
        self.extractor = FeatureExtractor()
        self._initialized = False
    
    def initialize(self) -> bool:
        """
        Initialize the predictor by loading models.
        
        Returns:
            True if initialization successful
        """
        logger.info("Initializing Sports Predictor...")
        
        # Try to load models
        models_loaded = self.models.load_all()
        
        if not models_loaded:
            logger.warning(
                "No trained models found. Run the training notebooks first. "
                "Falling back to market-based predictions."
            )
        
        logger.info(f"Models loaded: {self.models.models_loaded}")
        self._initialized = True
        
        return True
    
    def predict_market(self, market: Market) -> Optional[Prediction]:
        """
        Make a prediction for a single market.
        
        Args:
            market: Polymarket Market object
            
        Returns:
            Prediction object or None
        """
        # Extract features
        features = self.extractor.extract_features(market)
        
        # Skip if not sports
        if features["sport"] == "other":
            return None
        
        # Get predictions from each model
        hist_conf = 0.5
        sent_conf = 0.5
        hybrid_conf = 0.5
        
        # If we have models loaded, use them
        if self.models.historical_model and self.models.feature_names:
            try:
                X = self.extractor.to_model_input(features, self.models.feature_names)
                hist_conf = float(self.models.historical_model.predict_proba(X)[0, 1])
            except Exception as e:
                logger.warning(f"Historical model error: {e}")
        
        if self.models.sentiment_model and self.models.feature_names:
            try:
                X = self.extractor.to_model_input(features, self.models.feature_names)
                if self.models._use_tf:
                    sent_conf = float(self.models.sentiment_model.predict(X, verbose=0)[0, 0])
                else:
                    sent_conf = float(self.models.sentiment_model.predict_proba(X)[0, 1])
            except Exception as e:
                logger.warning(f"Sentiment model error: {e}")
        
        # Hybrid: Use meta-learner if available, otherwise weighted average
        if self.models.meta_learner:
            try:
                meta_X = np.array([[
                    hist_conf,
                    sent_conf,
                    hist_conf - sent_conf,
                    (hist_conf + sent_conf) / 2,
                    abs(hist_conf - 0.5),
                    abs(sent_conf - 0.5),
                ]])
                hybrid_conf = float(self.models.meta_learner.predict_proba(meta_X)[0, 1])
            except Exception as e:
                logger.warning(f"Meta-learner error: {e}")
                hybrid_conf = (hist_conf + sent_conf) / 2
        else:
            # Fallback: Use market price as prediction
            hybrid_conf = features["home_yes_price"]
        
        # Determine prediction
        predicted_outcome = "Yes" if hybrid_conf > 0.5 else "No"
        
        # Create Prediction object
        prediction = Prediction(
            market_id=market.condition_id,
            sport=features["sport"],
            event_name=market.question[:200],  # Truncate long questions
            predicted_outcome=predicted_outcome,
            historical_confidence=hist_conf,
            sentiment_confidence=sent_conf,
            hybrid_confidence=hybrid_conf,
        )
        
        return prediction
    
    def predict_current_markets(
        self,
        sport: Optional[str] = None,
        max_markets: int = 50,
    ) -> list[Prediction]:
        """
        Predict outcomes for current active markets.
        
        Args:
            sport: Filter by sport (optional)
            max_markets: Maximum number of markets to predict
            
        Returns:
            List of Prediction objects
        """
        if not self._initialized:
            self.initialize()
        
        logger.info("Fetching current sports markets...")
        
        # Get sports markets
        markets = self.polymarket.get_sports_markets(max_pages=3)
        
        # Filter to active/tradable markets
        active_markets = [m for m in markets if m.accepting_orders]
        
        if sport:
            # Filter by sport
            active_markets = [
                m for m in active_markets
                if self.extractor._detect_sport(m.question) == sport.lower()
            ]
        
        logger.info(f"Found {len(active_markets)} active markets")
        
        # Make predictions
        predictions = []
        for market in active_markets[:max_markets]:
            try:
                pred = self.predict_market(market)
                if pred:
                    predictions.append(pred)
            except Exception as e:
                logger.error(f"Error predicting market {market.condition_id}: {e}")
        
        logger.info(f"Generated {len(predictions)} predictions")
        return predictions
    
    def save_predictions(self, predictions: list[Prediction]) -> int:
        """
        Save predictions to Supabase.
        
        Args:
            predictions: List of Prediction objects
            
        Returns:
            Number of predictions saved
        """
        saved = 0
        
        for pred in predictions:
            try:
                self.supabase.save_prediction(pred)
                saved += 1
            except Exception as e:
                logger.error(f"Error saving prediction: {e}")
        
        logger.info(f"Saved {saved}/{len(predictions)} predictions to database")
        return saved
    
    def run(
        self,
        sport: Optional[str] = None,
        save: bool = True,
        max_markets: int = 50,
    ) -> list[Prediction]:
        """
        Run the full prediction pipeline.
        
        Args:
            sport: Filter by sport (optional)
            save: Whether to save to database
            max_markets: Maximum markets to process
            
        Returns:
            List of predictions
        """
        predictions = self.predict_current_markets(sport, max_markets)
        
        if save and predictions:
            self.save_predictions(predictions)
        
        return predictions


# =============================================================================
# CLI
# =============================================================================

def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="AI PolyMarket Sports Predictor"
    )
    parser.add_argument(
        "--sport",
        type=str,
        choices=["nba", "nfl", "mlb", "nhl", "mma", "soccer"],
        help="Filter by sport"
    )
    parser.add_argument(
        "--max",
        type=int,
        default=50,
        help="Maximum number of markets to predict"
    )
    parser.add_argument(
        "--no-save",
        action="store_true",
        help="Don't save predictions to database"
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug logging"
    )
    
    args = parser.parse_args()
    
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
    
    print("=" * 60)
    print("[PREDICTOR] AI PolyMarket Sports Picker")
    print("=" * 60)
    
    # Initialize predictor
    predictor = SportsPredictor()
    predictor.initialize()
    
    # Run predictions
    print(f"\n[*] Making predictions...")
    if args.sport:
        print(f"    Sport filter: {args.sport.upper()}")
    
    predictions = predictor.run(
        sport=args.sport,
        save=not args.no_save,
        max_markets=args.max,
    )
    
    # Display results
    print(f"\n[OK] Generated {len(predictions)} predictions")
    
    if predictions:
        print("\n" + "-" * 60)
        print("TOP PREDICTIONS (by confidence)")
        print("-" * 60)
        
        # Sort by hybrid confidence
        sorted_preds = sorted(
            predictions,
            key=lambda p: abs(p.hybrid_confidence - 0.5),
            reverse=True
        )
        
        for i, pred in enumerate(sorted_preds[:10], 1):
            conf = pred.hybrid_confidence
            direction = "YES" if conf > 0.5 else "NO"
            strength = abs(conf - 0.5) * 200  # 0-100%
            
            print(f"\n{i}. [{pred.sport.upper()}] {pred.event_name[:50]}...")
            print(f"   Prediction: {direction} ({strength:.1f}% confidence)")
            print(f"   Historical: {pred.historical_confidence:.2%}")
            print(f"   Sentiment:  {pred.sentiment_confidence:.2%}")
            print(f"   Hybrid:     {pred.hybrid_confidence:.2%}")
    
    print("\n" + "=" * 60)
    print("[DONE] Prediction complete!")
    if not args.no_save:
        print("Predictions saved to database.")
    print("=" * 60)


if __name__ == "__main__":
    main()
