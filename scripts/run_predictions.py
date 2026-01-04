#!/usr/bin/env python3
"""
Run Predictions Script

This script runs the ML predictor and outputs results to JSON files
that can be consumed by the Next.js API.

Usage:
    python scripts/run_predictions.py
    python scripts/run_predictions.py --sport nba --limit 10
"""

import sys
import json
import argparse
from pathlib import Path
from datetime import datetime, timezone

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.predictor import SportsPredictor
from src.scorer import PredictionScorer


def run_predictions(sport: str = None, limit: int = 50, save_to_db: bool = True):
    """Run predictions and return results."""
    print(f"[*] Initializing predictor...")
    
    predictor = SportsPredictor()
    if not predictor.initialize():
        print("[!] Failed to initialize predictor")
        return {"success": False, "error": "Failed to initialize models"}
    
    print(f"[*] Running predictions (sport={sport}, limit={limit})...")
    predictions = predictor.run(sport=sport, save=save_to_db, max_markets=limit)
    
    # Convert to JSON-serializable format
    results = []
    for pred in predictions:
        results.append({
            "id": pred.id,
            "market_id": pred.market_id,
            "sport": pred.sport,
            "event_name": pred.event_name,
            "predicted_outcome": pred.predicted_outcome,
            "historical_confidence": pred.historical_confidence,
            "sentiment_confidence": pred.sentiment_confidence,
            "hybrid_confidence": pred.hybrid_confidence,
            "created_at": pred.created_at,
        })
    
    return {
        "success": True,
        "count": len(results),
        "predictions": results,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def run_scoring():
    """Score pending predictions and update metrics."""
    print(f"[*] Initializing scorer...")
    
    scorer = PredictionScorer()
    
    print(f"[*] Scoring pending predictions...")
    results = scorer.score_pending_predictions()
    
    print(f"[*] Updating metrics...")
    scorer.update_metrics()
    
    summary = scorer.get_accuracy_summary()
    
    return {
        "success": True,
        "scored": results.get("scored", 0),
        "accuracy": summary,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def main():
    parser = argparse.ArgumentParser(description="Run ML predictions")
    parser.add_argument("--sport", choices=["nba", "nfl", "mlb", "nhl", "mma", "soccer"],
                        help="Filter by sport")
    parser.add_argument("--limit", type=int, default=20, help="Max markets to predict")
    parser.add_argument("--no-save", action="store_true", help="Don't save to database")
    parser.add_argument("--score", action="store_true", help="Score pending predictions")
    parser.add_argument("--output", type=str, help="Output JSON file path")
    
    args = parser.parse_args()
    
    if args.score:
        result = run_scoring()
    else:
        result = run_predictions(
            sport=args.sport,
            limit=args.limit,
            save_to_db=not args.no_save
        )
    
    # Output results
    output_json = json.dumps(result, indent=2)
    
    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        with open(args.output, "w") as f:
            f.write(output_json)
        print(f"[OK] Results saved to {args.output}")
    else:
        print(output_json)
    
    # Also save to artifacts for API consumption
    artifacts_dir = Path("artifacts/api_cache")
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    
    cache_file = artifacts_dir / ("scoring_results.json" if args.score else "predictions.json")
    with open(cache_file, "w") as f:
        f.write(output_json)
    print(f"[OK] Cached to {cache_file}")


if __name__ == "__main__":
    main()
