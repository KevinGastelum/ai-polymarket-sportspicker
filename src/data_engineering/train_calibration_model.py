"""
Market Calibration Model Trainer

This script trains an ML model to predict outcomes based on market calibration data.
It uses:
1. Feature Engineering: Creates features from market odds
2. XGBoost/Logistic Regression: Trains models to predict outcomes
3. Brier Score: Evaluates probability calibration

Output:
    models/calibration_model.pkl
    artifacts/model_performance.png
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, accuracy_score, classification_report
import pickle
import logging

# Try to import xgboost, fall back to sklearn if not available
try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("XGBoost not installed, using Logistic Regression only")

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# Constants
INPUT_FILE = Path("data/polymarket_raw_nba.csv")
MODEL_OUTPUT = Path("models/calibration_model.pkl")
PLOT_OUTPUT = Path("artifacts/model_performance.png")

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create features for the ML model."""
    df = df.copy()
    
    # Feature 1: Implied odds (same as market_implied_prob)
    df['implied_odds'] = df['market_implied_prob']
    
    # Feature 2: Implied odds spread (how far from 50/50)
    df['odds_spread'] = abs(df['market_implied_prob'] - 0.5)
    
    # Feature 3: Log odds (logit transformation for better linearity)
    # Clip to avoid log(0) or log(1)
    clipped_prob = df['market_implied_prob'].clip(0.01, 0.99)
    df['log_odds'] = np.log(clipped_prob / (1 - clipped_prob))
    
    # Feature 4: Squared probability (captures non-linearity)
    df['prob_squared'] = df['market_implied_prob'] ** 2
    
    # Feature 5: Volume category (higher volume = more reliable signal)
    df['high_volume'] = (df['volume_usd'] >= 10000).astype(int)
    df['medium_volume'] = ((df['volume_usd'] >= 1000) & (df['volume_usd'] < 10000)).astype(int)
    
    return df

def train_models(X_train, y_train, X_test, y_test):
    """Train and evaluate multiple models."""
    results = {}
    
    # Model 1: Logistic Regression (baseline)
    logger.info("\n=== Training Logistic Regression ===")
    lr_model = LogisticRegression(max_iter=1000)
    lr_model.fit(X_train, y_train)
    
    lr_probs = lr_model.predict_proba(X_test)[:, 1]
    lr_preds = lr_model.predict(X_test)
    
    lr_brier = brier_score_loss(y_test, lr_probs)
    lr_acc = accuracy_score(y_test, lr_preds)
    
    logger.info(f"Logistic Regression Brier Score: {lr_brier:.4f}")
    logger.info(f"Logistic Regression Accuracy: {lr_acc:.4f}")
    
    results['logistic_regression'] = {
        'model': lr_model,
        'brier_score': lr_brier,
        'accuracy': lr_acc,
        'predictions': lr_probs
    }
    
    # Model 2: XGBoost (if available)
    if HAS_XGBOOST:
        logger.info("\n=== Training XGBoost ===")
        xgb_model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=3,
            learning_rate=0.1,
            random_state=42,
            use_label_encoder=False,
            eval_metric='logloss'
        )
        xgb_model.fit(X_train, y_train)
        
        xgb_probs = xgb_model.predict_proba(X_test)[:, 1]
        xgb_preds = xgb_model.predict(X_test)
        
        xgb_brier = brier_score_loss(y_test, xgb_probs)
        xgb_acc = accuracy_score(y_test, xgb_preds)
        
        logger.info(f"XGBoost Brier Score: {xgb_brier:.4f}")
        logger.info(f"XGBoost Accuracy: {xgb_acc:.4f}")
        
        results['xgboost'] = {
            'model': xgb_model,
            'brier_score': xgb_brier,
            'accuracy': xgb_acc,
            'predictions': xgb_probs
        }
    
    # Baseline: Just using raw market probabilities
    logger.info("\n=== Baseline (Raw Market Odds) ===")
    baseline_probs = X_test['implied_odds'].values
    baseline_brier = brier_score_loss(y_test, baseline_probs)
    baseline_acc = accuracy_score(y_test, (baseline_probs >= 0.5).astype(int))
    
    logger.info(f"Baseline (Market) Brier Score: {baseline_brier:.4f}")
    logger.info(f"Baseline (Market) Accuracy: {baseline_acc:.4f}")
    
    results['baseline'] = {
        'brier_score': baseline_brier,
        'accuracy': baseline_acc,
        'predictions': baseline_probs
    }
    
    return results

def plot_results(results, y_test, output_path):
    """Create visualization of model performance."""
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    # Plot 1: Brier Scores Comparison
    ax1 = axes[0]
    models = list(results.keys())
    brier_scores = [results[m]['brier_score'] for m in models]
    
    colors = ['#4CAF50', '#2196F3', '#FF9800'][:len(models)]
    bars = ax1.bar(models, brier_scores, color=colors)
    ax1.set_ylabel('Brier Score (lower is better)')
    ax1.set_title('Model Calibration Comparison')
    ax1.set_ylim(0, max(brier_scores) * 1.3)
    
    for bar, score in zip(bars, brier_scores):
        ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                f'{score:.4f}', ha='center', va='bottom')
    
    # Plot 2: Calibration Curves
    ax2 = axes[1]
    ax2.plot([0, 1], [0, 1], 'k--', label='Perfect Calibration')
    
    for model_name, model_data in results.items():
        probs = model_data['predictions']
        
        # Create bins
        bins = np.linspace(0, 1, 6)
        bin_indices = np.digitize(probs, bins) - 1
        
        bin_probs = []
        bin_actuals = []
        
        for i in range(len(bins) - 1):
            mask = bin_indices == i
            if mask.sum() > 0:
                bin_probs.append(probs[mask].mean())
                bin_actuals.append(y_test.values[mask].mean())
        
        if bin_probs:
            ax2.plot(bin_probs, bin_actuals, 'o-', label=model_name, markersize=8)
    
    ax2.set_xlabel('Predicted Probability')
    ax2.set_ylabel('Actual Win Rate')
    ax2.set_title('Calibration Curves')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path, dpi=150)
    logger.info(f"\nPlot saved to {output_path}")

def main():
    logger.info("=" * 60)
    logger.info("Market Calibration Model Training")
    logger.info("=" * 60)
    
    # Load data
    if not INPUT_FILE.exists():
        logger.error(f"Input file {INPUT_FILE} not found!")
        return
    
    df = pd.read_csv(INPUT_FILE)
    logger.info(f"Loaded {len(df)} records")
    
    # Feature engineering
    df = engineer_features(df)
    
    # Prepare features and target
    feature_cols = ['implied_odds', 'odds_spread', 'log_odds', 'prob_squared', 
                    'high_volume', 'medium_volume']
    X = df[feature_cols]
    y = df['actual_result_binary']
    
    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42
    )
    
    logger.info(f"Training set: {len(X_train)} samples")
    logger.info(f"Test set: {len(X_test)} samples")
    
    # Train models
    results = train_models(X_train, y_train, X_test, y_test)
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("SUMMARY: Model Comparison")
    logger.info("=" * 60)
    
    best_model = min(results.keys(), key=lambda m: results[m]['brier_score'])
    logger.info(f"Best Model: {best_model}")
    logger.info(f"Brier Score: {results[best_model]['brier_score']:.4f}")
    
    # Check if we beat the market
    market_brier = results['baseline']['brier_score']
    best_brier = results[best_model]['brier_score']
    
    if best_brier < market_brier:
        improvement = (market_brier - best_brier) / market_brier * 100
        logger.info(f"✅ Model BEATS market by {improvement:.1f}%!")
    else:
        logger.info("❌ Market is well-calibrated (no edge found)")
    
    # Save best model
    if best_model != 'baseline' and 'model' in results[best_model]:
        MODEL_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        with open(MODEL_OUTPUT, 'wb') as f:
            pickle.dump(results[best_model]['model'], f)
        logger.info(f"\nModel saved to {MODEL_OUTPUT}")
    
    # Plot results
    plot_results(results, y_test, PLOT_OUTPUT)

if __name__ == "__main__":
    main()
