"""
Supabase Client for AI PolyMarket Sports Picker

This module provides integration with Supabase for storing:
- Predictions
- Market data
- Model metrics
- User data

Supabase Free Tier Limits:
- 500MB Database
- 50,000 monthly active users
- 2GB Bandwidth
"""

import os
import json
import logging
from typing import Optional
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# Configuration
# =============================================================================

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")  # anon/public key


# =============================================================================
# Pydantic Models
# =============================================================================

class Prediction(BaseModel):
    """A prediction made by our ML models."""
    id: Optional[str] = None
    market_id: str
    sport: str
    event_name: str
    predicted_outcome: str
    historical_confidence: float = 0.0
    sentiment_confidence: float = 0.0
    hybrid_confidence: float = 0.0
    actual_outcome: Optional[str] = None
    is_correct: Optional[bool] = None
    created_at: Optional[str] = None
    resolved_at: Optional[str] = None


class ModelMetrics(BaseModel):
    """Rolling accuracy metrics for each model type."""
    id: Optional[str] = None
    model_type: str  # 'historical', 'sentiment', 'hybrid'
    accuracy_7d: float = 0.0
    accuracy_30d: float = 0.0
    total_predictions: int = 0
    correct_predictions: int = 0
    updated_at: Optional[str] = None


class MarketCache(BaseModel):
    """Cached market data from Polymarket."""
    condition_id: str
    question: str
    sport: str
    end_date: Optional[str] = None
    yes_price: Optional[float] = None
    no_price: Optional[float] = None
    is_active: bool = True
    last_updated: Optional[str] = None


# =============================================================================
# Supabase Client
# =============================================================================

class SupabaseClient:
    """
    Client for interacting with Supabase.
    
    Falls back to local JSON storage if Supabase is not configured.
    This allows development without a database connection.
    
    Usage:
        client = SupabaseClient()
        
        # Save a prediction
        prediction = Prediction(
            market_id="abc123",
            sport="nba",
            event_name="Lakers vs Celtics",
            predicted_outcome="Lakers",
            hybrid_confidence=0.75
        )
        client.save_prediction(prediction)
        
        # Get recent predictions
        predictions = client.get_predictions(limit=10)
    """
    
    def __init__(
        self,
        url: str = SUPABASE_URL,
        key: str = SUPABASE_KEY,
        local_storage_path: str = "artifacts/local_db",
    ):
        """
        Initialize the Supabase client.
        
        Args:
            url: Supabase project URL
            key: Supabase anon/public key
            local_storage_path: Path for local JSON storage fallback
        """
        self.url = url
        self.key = key
        self.local_storage_path = Path(local_storage_path)
        self.client = None
        self._use_local = True
        
        # Try to connect to Supabase
        if url and key:
            try:
                from supabase import create_client, Client
                self.client: Client = create_client(url, key)
                self._use_local = False
                logger.info("Connected to Supabase successfully")
            except ImportError:
                logger.warning(
                    "supabase-py not installed. Run: pip install supabase"
                )
            except Exception as e:
                logger.warning(f"Failed to connect to Supabase: {e}")
        else:
            logger.info(
                "Supabase not configured. Using local storage at: "
                f"{self.local_storage_path}"
            )
        
        # Ensure local storage directory exists
        self.local_storage_path.mkdir(parents=True, exist_ok=True)
    
    @property
    def is_connected(self) -> bool:
        """Check if connected to Supabase."""
        return not self._use_local
    
    # =========================================================================
    # Predictions
    # =========================================================================
    
    def save_prediction(self, prediction: Prediction) -> Prediction:
        """
        Save a new prediction.
        
        Args:
            prediction: Prediction to save
            
        Returns:
            Saved prediction with ID
        """
        if not prediction.created_at:
            prediction.created_at = datetime.now(timezone.utc).isoformat()
        
        if self.is_connected:
            try:
                data = prediction.model_dump(exclude={"id"})
                result = self.client.table("predictions").insert(data).execute()
                if result.data:
                    prediction.id = result.data[0].get("id")
                logger.info(f"Saved prediction to Supabase: {prediction.id}")
            except Exception as e:
                logger.error(f"Failed to save to Supabase: {e}")
                return self._save_prediction_local(prediction)
        else:
            return self._save_prediction_local(prediction)
        
        return prediction
    
    def _save_prediction_local(self, prediction: Prediction) -> Prediction:
        """Save prediction to local JSON file."""
        file_path = self.local_storage_path / "predictions.json"
        
        predictions = []
        if file_path.exists():
            with open(file_path, "r") as f:
                predictions = json.load(f)
        
        # Generate ID
        prediction.id = f"local_{len(predictions) + 1}"
        predictions.append(prediction.model_dump())
        
        with open(file_path, "w") as f:
            json.dump(predictions, f, indent=2, default=str)
        
        logger.info(f"Saved prediction locally: {prediction.id}")
        return prediction
    
    def get_predictions(
        self,
        limit: int = 100,
        model_type: Optional[str] = None,
        sport: Optional[str] = None,
        only_resolved: bool = False,
    ) -> list[Prediction]:
        """
        Get predictions with optional filters.
        
        Args:
            limit: Maximum number of predictions to return
            model_type: Filter by model type (not implemented yet)
            sport: Filter by sport type
            only_resolved: Only return resolved predictions
            
        Returns:
            List of predictions
        """
        if self.is_connected:
            try:
                query = self.client.table("predictions").select("*")
                
                if sport:
                    query = query.eq("sport", sport)
                if only_resolved:
                    query = query.not_.is_("actual_outcome", "null")
                
                result = query.limit(limit).order(
                    "created_at", desc=True
                ).execute()
                
                return [Prediction(**row) for row in result.data]
            except Exception as e:
                logger.error(f"Failed to fetch from Supabase: {e}")
                return self._get_predictions_local(limit, sport, only_resolved)
        else:
            return self._get_predictions_local(limit, sport, only_resolved)
    
    def _get_predictions_local(
        self,
        limit: int,
        sport: Optional[str],
        only_resolved: bool,
    ) -> list[Prediction]:
        """Get predictions from local storage."""
        file_path = self.local_storage_path / "predictions.json"
        
        if not file_path.exists():
            return []
        
        with open(file_path, "r") as f:
            predictions = json.load(f)
        
        result = []
        for p in predictions:
            pred = Prediction(**p)
            
            if sport and pred.sport != sport:
                continue
            if only_resolved and not pred.actual_outcome:
                continue
            
            result.append(pred)
            
            if len(result) >= limit:
                break
        
        return result
    
    def resolve_prediction(
        self,
        prediction_id: str,
        actual_outcome: str,
    ) -> Optional[Prediction]:
        """
        Resolve a prediction with the actual outcome.
        
        Args:
            prediction_id: ID of prediction to resolve
            actual_outcome: The actual result
            
        Returns:
            Updated prediction or None
        """
        if self.is_connected:
            try:
                # Fetch the prediction first
                result = self.client.table("predictions").select("*").eq(
                    "id", prediction_id
                ).single().execute()
                
                if not result.data:
                    return None
                
                prediction = Prediction(**result.data)
                is_correct = prediction.predicted_outcome.lower() == actual_outcome.lower()
                
                # Update
                self.client.table("predictions").update({
                    "actual_outcome": actual_outcome,
                    "is_correct": is_correct,
                    "resolved_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", prediction_id).execute()
                
                prediction.actual_outcome = actual_outcome
                prediction.is_correct = is_correct
                
                return prediction
            except Exception as e:
                logger.error(f"Failed to resolve prediction: {e}")
                return None
        else:
            return self._resolve_prediction_local(prediction_id, actual_outcome)
    
    def _resolve_prediction_local(
        self,
        prediction_id: str,
        actual_outcome: str,
    ) -> Optional[Prediction]:
        """Resolve prediction in local storage."""
        file_path = self.local_storage_path / "predictions.json"
        
        if not file_path.exists():
            return None
        
        with open(file_path, "r") as f:
            predictions = json.load(f)
        
        for p in predictions:
            if p.get("id") == prediction_id:
                p["actual_outcome"] = actual_outcome
                p["is_correct"] = p["predicted_outcome"].lower() == actual_outcome.lower()
                p["resolved_at"] = datetime.now(timezone.utc).isoformat()
                
                with open(file_path, "w") as f:
                    json.dump(predictions, f, indent=2, default=str)
                
                return Prediction(**p)
        
        return None
    
    # =========================================================================
    # Model Metrics
    # =========================================================================
    
    def update_model_metrics(self, model_type: str) -> Optional[ModelMetrics]:
        """
        Recalculate and update metrics for a model type.
        
        Args:
            model_type: 'historical', 'sentiment', or 'hybrid'
            
        Returns:
            Updated metrics
        """
        predictions = self.get_predictions(limit=1000, only_resolved=True)
        
        if not predictions:
            return None
        
        # Calculate metrics
        total = len(predictions)
        correct = sum(1 for p in predictions if p.is_correct)
        
        # TODO: Calculate 7d and 30d accuracy
        accuracy = correct / total if total > 0 else 0.0
        
        metrics = ModelMetrics(
            model_type=model_type,
            accuracy_7d=accuracy,
            accuracy_30d=accuracy,
            total_predictions=total,
            correct_predictions=correct,
            updated_at=datetime.now(timezone.utc).isoformat(),
        )
        
        if self.is_connected:
            try:
                # Upsert metrics
                self.client.table("model_metrics").upsert({
                    "model_type": model_type,
                    **metrics.model_dump(exclude={"id", "model_type"}),
                }).execute()
            except Exception as e:
                logger.error(f"Failed to update metrics: {e}")
        
        return metrics
    
    def get_model_metrics(self) -> list[ModelMetrics]:
        """Get metrics for all model types."""
        if self.is_connected:
            try:
                result = self.client.table("model_metrics").select("*").execute()
                return [ModelMetrics(**row) for row in result.data]
            except Exception as e:
                logger.error(f"Failed to fetch metrics: {e}")
        
        # Return empty metrics for all types
        return [
            ModelMetrics(model_type="historical"),
            ModelMetrics(model_type="sentiment"),
            ModelMetrics(model_type="hybrid"),
        ]
    
    # =========================================================================
    # Market Cache
    # =========================================================================
    
    def cache_markets(self, markets: list[MarketCache]) -> int:
        """
        Cache market data.
        
        Args:
            markets: List of markets to cache
            
        Returns:
            Number of markets cached
        """
        if self.is_connected:
            try:
                data = [m.model_dump() for m in markets]
                self.client.table("market_cache").upsert(
                    data, on_conflict="condition_id"
                ).execute()
                return len(markets)
            except Exception as e:
                logger.error(f"Failed to cache markets: {e}")
        
        # Local fallback
        file_path = self.local_storage_path / "market_cache.json"
        
        existing = {}
        if file_path.exists():
            with open(file_path, "r") as f:
                existing = {m["condition_id"]: m for m in json.load(f)}
        
        for market in markets:
            existing[market.condition_id] = market.model_dump()
        
        with open(file_path, "w") as f:
            json.dump(list(existing.values()), f, indent=2, default=str)
        
        return len(markets)


# =============================================================================
# SQL Schema (for Supabase setup)
# =============================================================================

SCHEMA_SQL = """
-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id TEXT NOT NULL,
    sport TEXT NOT NULL,
    event_name TEXT NOT NULL,
    predicted_outcome TEXT NOT NULL,
    historical_confidence FLOAT DEFAULT 0.0,
    sentiment_confidence FLOAT DEFAULT 0.0,
    hybrid_confidence FLOAT DEFAULT 0.0,
    actual_outcome TEXT,
    is_correct BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_predictions_sport ON predictions(sport);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_is_correct ON predictions(is_correct);

-- Model metrics table
CREATE TABLE IF NOT EXISTS model_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_type TEXT UNIQUE NOT NULL,
    accuracy_7d FLOAT DEFAULT 0.0,
    accuracy_30d FLOAT DEFAULT 0.0,
    total_predictions INT DEFAULT 0,
    correct_predictions INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market cache table
CREATE TABLE IF NOT EXISTS market_cache (
    condition_id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    sport TEXT,
    end_date TIMESTAMP WITH TIME ZONE,
    yes_price FLOAT,
    no_price FLOAT,
    is_active BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (optional, for multi-user)
-- ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE model_metrics ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE market_cache ENABLE ROW LEVEL SECURITY;
"""


# =============================================================================
# CLI Entry Point
# =============================================================================

def main():
    """Test the Supabase client."""
    print("=" * 60)
    print("[SUPABASE] Testing Supabase Client")
    print("=" * 60)
    
    client = SupabaseClient()
    
    print(f"\n[*] Connected to Supabase: {client.is_connected}")
    print(f"[*] Local storage path: {client.local_storage_path}")
    
    # Test saving a prediction
    print("\n[*] Testing prediction save...")
    test_prediction = Prediction(
        market_id="test_market_001",
        sport="nba",
        event_name="Test: Lakers vs Celtics",
        predicted_outcome="Lakers",
        historical_confidence=0.65,
        sentiment_confidence=0.72,
        hybrid_confidence=0.68,
    )
    
    saved = client.save_prediction(test_prediction)
    print(f"[OK] Saved prediction: {saved.id}")
    
    # Test fetching predictions
    print("\n[*] Testing prediction fetch...")
    predictions = client.get_predictions(limit=5)
    print(f"[OK] Found {len(predictions)} predictions")
    
    for p in predictions:
        status = "[RESOLVED]" if p.is_correct is not None else "[PENDING]"
        correct = "[CORRECT]" if p.is_correct else "[WRONG]" if p.is_correct is False else ""
        print(f"  - {p.event_name} {status} {correct}")
    
    # Test resolving
    if predictions:
        print("\n[*] Testing prediction resolve...")
        resolved = client.resolve_prediction(predictions[0].id, "Lakers")
        if resolved:
            print(f"[OK] Resolved: {resolved.event_name} -> {resolved.actual_outcome}")
            print(f"     Correct: {resolved.is_correct}")
    
    print("\n" + "=" * 60)
    print("[DONE] Supabase client tests complete")
    print("=" * 60)
    
    # Print schema for reference
    print("\n[INFO] To set up Supabase, run this SQL in the SQL Editor:")
    print("-" * 60)
    print(SCHEMA_SQL)


if __name__ == "__main__":
    main()
