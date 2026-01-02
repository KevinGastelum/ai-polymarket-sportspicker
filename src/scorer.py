"""
Post-Event Scorer for AI PolyMarket Sports Picker

This module handles:
1. Checking for resolved Polymarket markets
2. Fetching actual outcomes
3. Scoring predictions as correct/wrong
4. Updating rolling accuracy metrics

Usage:
    # Score all pending predictions
    python src/scorer.py
    
    # Score specific sport
    python src/scorer.py --sport nba
"""

import os
import json
import logging
import argparse
from typing import Optional
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import our modules
from src.tools.polymarket_client import PolymarketClient, Market
from src.tools.supabase_client import SupabaseClient, Prediction, ModelMetrics


# =============================================================================
# Scorer
# =============================================================================

class PredictionScorer:
    """
    Scores predictions based on actual market outcomes.
    
    Usage:
        scorer = PredictionScorer()
        
        # Score all pending predictions
        results = scorer.score_pending_predictions()
        
        # Update accuracy metrics
        scorer.update_metrics()
    """
    
    def __init__(self):
        self.polymarket = PolymarketClient()
        self.supabase = SupabaseClient()
    
    def get_market_outcome(self, market: Market) -> Optional[str]:
        """
        Get the resolved outcome of a market.
        
        Args:
            market: Polymarket Market object
            
        Returns:
            "Yes", "No", or None if not resolved
        """
        if not market.closed:
            return None
        
        tokens = market.tokens or []
        
        for token in tokens:
            # A winning outcome has price = 1.0
            price = token.get("price")
            if price is not None and float(price) == 1.0:
                return token.get("outcome", "").capitalize()
        
        # Check for price close to 1.0 (sometimes doesn't round exactly)
        for token in tokens:
            price = token.get("price")
            if price is not None and float(price) > 0.95:
                return token.get("outcome", "").capitalize()
        
        return None
    
    def score_prediction(
        self,
        prediction: Prediction,
        actual_outcome: str,
    ) -> Prediction:
        """
        Score a single prediction.
        
        Args:
            prediction: Prediction to score
            actual_outcome: The actual outcome ("Yes" or "No")
            
        Returns:
            Updated prediction
        """
        # Normalize outcomes for comparison
        predicted = prediction.predicted_outcome.lower().strip()
        actual = actual_outcome.lower().strip()
        
        is_correct = predicted == actual
        
        # Update via Supabase
        resolved = self.supabase.resolve_prediction(
            prediction.id,
            actual_outcome
        )
        
        if resolved:
            logger.info(
                f"Scored prediction {prediction.id}: "
                f"predicted={predicted}, actual={actual}, correct={is_correct}"
            )
            return resolved
        
        return prediction
    
    def score_pending_predictions(
        self,
        sport: Optional[str] = None,
        limit: int = 100,
    ) -> dict:
        """
        Score all pending (unresolved) predictions.
        
        Args:
            sport: Filter by sport (optional)
            limit: Maximum predictions to process
            
        Returns:
            Dict with scoring results
        """
        logger.info("Fetching pending predictions...")
        
        # Get predictions without actual outcomes
        all_predictions = self.supabase.get_predictions(
            limit=limit,
            sport=sport,
            only_resolved=False,
        )
        
        pending = [p for p in all_predictions if p.actual_outcome is None]
        logger.info(f"Found {len(pending)} pending predictions")
        
        if not pending:
            return {
                "total": 0,
                "scored": 0,
                "correct": 0,
                "wrong": 0,
                "still_pending": 0,
            }
        
        # Get unique market IDs
        market_ids = list(set(p.market_id for p in pending))
        
        # Fetch current market states from Polymarket
        logger.info(f"Checking {len(market_ids)} unique markets...")
        
        # Get all markets and filter to our IDs
        all_markets = self.polymarket.get_sports_markets(max_pages=10)
        market_lookup = {m.condition_id: m for m in all_markets}
        
        # Score each prediction
        results = {
            "total": len(pending),
            "scored": 0,
            "correct": 0,
            "wrong": 0,
            "still_pending": 0,
        }
        
        for prediction in pending:
            market = market_lookup.get(prediction.market_id)
            
            if not market:
                logger.debug(f"Market {prediction.market_id} not found")
                results["still_pending"] += 1
                continue
            
            outcome = self.get_market_outcome(market)
            
            if outcome is None:
                results["still_pending"] += 1
                continue
            
            # Score the prediction
            scored = self.score_prediction(prediction, outcome)
            results["scored"] += 1
            
            if scored.is_correct:
                results["correct"] += 1
            else:
                results["wrong"] += 1
        
        return results
    
    def update_metrics(self) -> dict:
        """
        Update rolling accuracy metrics for all models.
        
        Returns:
            Dict with updated metrics
        """
        logger.info("Updating model metrics...")
        
        # Get all resolved predictions
        resolved = self.supabase.get_predictions(
            limit=1000,
            only_resolved=True,
        )
        
        if not resolved:
            logger.info("No resolved predictions found")
            return {}
        
        # Calculate metrics by model
        metrics = {}
        
        for model_type in ["historical", "sentiment", "hybrid"]:
            # Get confidence field
            if model_type == "historical":
                get_conf = lambda p: p.historical_confidence
            elif model_type == "sentiment":
                get_conf = lambda p: p.sentiment_confidence
            else:
                get_conf = lambda p: p.hybrid_confidence
            
            # For each prediction, determine if this model would have been correct
            total = 0
            correct = 0
            
            for pred in resolved:
                conf = get_conf(pred)
                model_prediction = "Yes" if conf > 0.5 else "No"
                
                if pred.actual_outcome:
                    total += 1
                    if model_prediction.lower() == pred.actual_outcome.lower():
                        correct += 1
            
            accuracy = correct / total if total > 0 else 0.0
            
            metrics[model_type] = ModelMetrics(
                model_type=model_type,
                accuracy_7d=accuracy,  # TODO: Filter by date
                accuracy_30d=accuracy,  # TODO: Filter by date
                total_predictions=total,
                correct_predictions=correct,
            )
            
            # Update in Supabase
            self.supabase.update_model_metrics(model_type)
        
        logger.info(f"Updated metrics for {len(metrics)} models")
        return metrics
    
    def get_accuracy_summary(self) -> dict:
        """
        Get a summary of current accuracy metrics.
        
        Returns:
            Dict with accuracy stats
        """
        metrics = self.supabase.get_model_metrics()
        
        summary = {}
        for m in metrics:
            summary[m.model_type] = {
                "accuracy": m.accuracy_30d,
                "total": m.total_predictions,
                "correct": m.correct_predictions,
            }
        
        return summary


# =============================================================================
# CLI
# =============================================================================

def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="AI PolyMarket Prediction Scorer"
    )
    parser.add_argument(
        "--sport",
        type=str,
        choices=["nba", "nfl", "mlb", "nhl", "mma", "soccer"],
        help="Filter by sport"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Maximum predictions to score"
    )
    parser.add_argument(
        "--update-metrics",
        action="store_true",
        help="Update rolling accuracy metrics"
    )
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Show accuracy summary only"
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
    print("[SCORER] AI PolyMarket Prediction Scorer")
    print("=" * 60)
    
    scorer = PredictionScorer()
    
    # Show summary only
    if args.summary:
        print("\n[ACCURACY SUMMARY]")
        print("-" * 40)
        
        summary = scorer.get_accuracy_summary()
        
        if not summary:
            print("No metrics available yet.")
        else:
            for model, stats in summary.items():
                acc = stats["accuracy"] * 100
                total = stats["total"]
                correct = stats["correct"]
                
                bar = "█" * int(acc / 5) + "░" * (20 - int(acc / 5))
                print(f"\n{model.upper():12} {bar} {acc:.1f}%")
                print(f"             {correct}/{total} correct")
        
        print("\n" + "=" * 60)
        return
    
    # Score pending predictions
    print(f"\n[*] Scoring pending predictions...")
    if args.sport:
        print(f"    Sport filter: {args.sport.upper()}")
    
    results = scorer.score_pending_predictions(
        sport=args.sport,
        limit=args.limit,
    )
    
    print(f"\n[RESULTS]")
    print(f"  Total pending: {results['total']}")
    print(f"  Scored:        {results['scored']}")
    print(f"  Correct:       {results['correct']}")
    print(f"  Wrong:         {results['wrong']}")
    print(f"  Still pending: {results['still_pending']}")
    
    if results['scored'] > 0:
        accuracy = results['correct'] / results['scored'] * 100
        print(f"\n  Accuracy: {accuracy:.1f}%")
    
    # Update metrics if requested
    if args.update_metrics:
        print("\n[*] Updating rolling metrics...")
        metrics = scorer.update_metrics()
        
        print("\n[UPDATED METRICS]")
        for model_type, m in metrics.items():
            acc = m.accuracy_30d * 100
            print(f"  {model_type}: {acc:.1f}% ({m.correct_predictions}/{m.total_predictions})")
    
    print("\n" + "=" * 60)
    print("[DONE] Scoring complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
