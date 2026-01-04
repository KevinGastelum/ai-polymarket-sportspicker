"""
Market Calibration Analyzer

This script performs EDA on the fetched Polymarket data.
It:
1. Loads the raw CSV.
2. Filters out low liquidity markets (noisy data).
3. Bins probabilities into buckets (e.g., 0-5%, 5-10%).
4. Calculates actual win rates for each bucket.
5. Generates a Reliability Diagram (Calibration Plot).

Target:
    Analyze if appropriate to buy when market says X% but reality is Y%.
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# Constants
INPUT_FILE = Path("data/polymarket_raw_nba.csv")
OUTPUT_PLOT = Path("artifacts/calibration_plot_nba.png")
MIN_VOLUME_USD = 1000.0 # Filter out thin markets

def analyze_calibration():
    if not INPUT_FILE.exists():
        logger.error(f"Input file {INPUT_FILE} not found. Run fetch_polymarket_data.py first.")
        return

    logger.info(f"Loading data from {INPUT_FILE}...")
    df = pd.read_csv(INPUT_FILE)
    
    logger.info(f"Initial records: {len(df)}")
    
    # Filter 1: Volume
    df_clean = df[df['volume_usd'] >= MIN_VOLUME_USD].copy()
    logger.info(f"Records after volume filter (>= ${MIN_VOLUME_USD}): {len(df_clean)}")
    
    if len(df_clean) < 10:
        logger.warning("Not enough data to analyze!")
        return

    # Filter 2: Valid Probabilities (0-1)
    df_clean = df_clean[(df_clean['market_implied_prob'] >= 0) & (df_clean['market_implied_prob'] <= 1)]

    # Binning
    # Create 5% bins
    bins = np.arange(0, 1.05, 0.05)
    df_clean['prob_bin'] = pd.cut(df_clean['market_implied_prob'], bins=bins)
    
    calibration = df_clean.groupby('prob_bin').agg(
        mean_predicted_prob=('market_implied_prob', 'mean'),
        actual_win_rate=('actual_result_binary', 'mean'),
        count=('market_implied_prob', 'count')
    ).reset_index()

    # Drop empty bins
    calibration = calibration[calibration['count'] > 0]

    print("\nCalibration Table:")
    print(calibration[['prob_bin', 'mean_predicted_prob', 'actual_win_rate', 'count']])

    # Plotting
    plt.figure(figsize=(10, 10))
    
    # Perfect calibration line
    plt.plot([0, 1], [0, 1], "k--", label="Perfectly Calibrated")
    
    # Actual data
    plt.plot(
        calibration['mean_predicted_prob'], 
        calibration['actual_win_rate'], 
        "o-", 
        label="Polymarket (NBA)",
        linewidth=2,
        markersize=8
    )
    
    # Styling
    plt.title("Polymarket Reliability Diagram (NBA)", fontsize=16)
    plt.xlabel("Market Implied Probability", fontsize=14)
    plt.ylabel("Actual Win Rate", fontsize=14)
    plt.grid(True, alpha=0.3)
    plt.legend()
    
    # Save
    OUTPUT_PLOT.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(OUTPUT_PLOT)
    logger.info(f"\nCalibration plot saved to {OUTPUT_PLOT}")

if __name__ == "__main__":
    analyze_calibration()
