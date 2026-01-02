# %% [markdown]
# # 🏈 AI PolyMarket Sports Picker - Data Preparation
# 
# This notebook prepares the training data for our ML models.
# 
# **Run this in Google Colab for free GPU access!**
# 
# [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/YOUR_USERNAME/polymarket-predictor/blob/main/notebooks/data_prep.py)

# %% [markdown]
# ## 1. Setup

# %%
# Install dependencies (run in Colab)
# !pip install pandas numpy scikit-learn matplotlib seaborn

# %%
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
import json
import os

# %%
# Mount Google Drive (for Colab)
# from google.colab import drive
# drive.mount('/content/drive')

# %% [markdown]
# ## 2. Load Data

# %%
# Option 1: Load from local file
# df = pd.read_csv('artifacts/processed_data/polymarket_training.csv')

# Option 2: Load from Google Drive (in Colab)
# df = pd.read_csv('/content/drive/MyDrive/polymarket/polymarket_training.csv')

# Option 3: Load from GitHub raw URL
# df = pd.read_csv('https://raw.githubusercontent.com/YOUR_USERNAME/polymarket-predictor/main/artifacts/processed_data/polymarket_training.csv')

# For local development:
try:
    df = pd.read_csv('artifacts/processed_data/polymarket_training.csv')
    print(f"Loaded {len(df)} training examples")
except FileNotFoundError:
    print("File not found. Upload polymarket_training.csv to Colab or run processor.py first")
    df = None

# %%
if df is not None:
    print("\n=== Dataset Info ===")
    print(df.info())
    
    print("\n=== First 5 rows ===")
    display(df.head()) if 'display' in dir() else print(df.head())
    
    print("\n=== Target Distribution ===")
    print(df['home_win'].value_counts())

# %% [markdown]
# ## 3. Exploratory Data Analysis

# %%
if df is not None:
    # Sport distribution
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    
    # Sport counts
    sport_counts = df['sport'].value_counts()
    axes[0, 0].bar(sport_counts.index, sport_counts.values, color='steelblue')
    axes[0, 0].set_title('Games by Sport')
    axes[0, 0].set_xlabel('Sport')
    axes[0, 0].set_ylabel('Count')
    axes[0, 0].tick_params(axis='x', rotation=45)
    
    # Win rate by sport
    win_rate = df.groupby('sport')['home_win'].mean()
    axes[0, 1].bar(win_rate.index, win_rate.values, color='green')
    axes[0, 1].axhline(y=0.5, color='red', linestyle='--', label='50%')
    axes[0, 1].set_title('Home Win Rate by Sport')
    axes[0, 1].set_xlabel('Sport')
    axes[0, 1].set_ylabel('Win Rate')
    axes[0, 1].tick_params(axis='x', rotation=45)
    axes[0, 1].legend()
    
    # Price spread distribution
    axes[1, 0].hist(df['price_spread'], bins=50, color='purple', alpha=0.7)
    axes[1, 0].set_title('Price Spread Distribution')
    axes[1, 0].set_xlabel('Price Spread')
    axes[1, 0].set_ylabel('Count')
    
    # Home yes price distribution
    axes[1, 1].hist(df['home_yes_price'], bins=50, color='orange', alpha=0.7)
    axes[1, 1].set_title('Home Yes Price (Implied Probability)')
    axes[1, 1].set_xlabel('Price')
    axes[1, 1].set_ylabel('Count')
    
    plt.tight_layout()
    plt.savefig('artifacts/eda_plots.png', dpi=150)
    plt.show()
    
    print("Saved EDA plots to artifacts/eda_plots.png")

# %% [markdown]
# ## 4. Feature Engineering

# %%
def prepare_features(df):
    """
    Prepare features for ML training.
    
    Returns:
        X: Feature matrix
        y: Target vector
        feature_names: List of feature names
    """
    df = df.copy()
    
    # Handle missing values
    df['home_win_pct'] = df['home_win_pct'].fillna(0.5)
    df['away_win_pct'] = df['away_win_pct'].fillna(0.5)
    
    # Create additional features
    df['win_pct_diff'] = df['home_win_pct'] - df['away_win_pct']
    df['market_edge'] = df['home_yes_price'] - 0.5  # Deviation from fair odds
    
    # One-hot encode sport
    sport_dummies = pd.get_dummies(df['sport'], prefix='sport')
    
    # Select numeric features
    numeric_features = [
        'home_wins', 'home_losses', 'away_wins', 'away_losses',
        'home_win_pct', 'away_win_pct', 'win_pct_diff',
        'home_yes_price', 'away_yes_price', 'price_spread',
        'market_edge',
    ]
    
    # Only include columns that exist
    numeric_features = [f for f in numeric_features if f in df.columns]
    
    # Combine features
    X = pd.concat([df[numeric_features], sport_dummies], axis=1)
    y = df['home_win']
    
    feature_names = list(X.columns)
    
    return X, y, feature_names

# %%
if df is not None:
    X, y, feature_names = prepare_features(df)
    
    print(f"Feature matrix shape: {X.shape}")
    print(f"Target shape: {y.shape}")
    print(f"\nFeatures ({len(feature_names)}):")
    for i, name in enumerate(feature_names, 1):
        print(f"  {i}. {name}")

# %% [markdown]
# ## 5. Train/Test Split & Scaling

# %%
if df is not None:
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, 
        test_size=0.2, 
        random_state=42,
        stratify=y  # Maintain class balance
    )
    
    print(f"Training set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    print(f"\nScaled feature range: [{X_train_scaled.min():.2f}, {X_train_scaled.max():.2f}]")

# %% [markdown]
# ## 6. Save Prepared Data

# %%
if df is not None:
    # Save for use in model training notebooks
    output_dir = 'artifacts/prepared_data'
    os.makedirs(output_dir, exist_ok=True)
    
    # Save as numpy arrays
    np.save(f'{output_dir}/X_train.npy', X_train_scaled)
    np.save(f'{output_dir}/X_test.npy', X_test_scaled)
    np.save(f'{output_dir}/y_train.npy', y_train.values)
    np.save(f'{output_dir}/y_test.npy', y_test.values)
    
    # Save feature names
    with open(f'{output_dir}/feature_names.json', 'w') as f:
        json.dump(feature_names, f)
    
    # Save scaler parameters
    scaler_params = {
        'mean': scaler.mean_.tolist(),
        'scale': scaler.scale_.tolist(),
    }
    with open(f'{output_dir}/scaler_params.json', 'w') as f:
        json.dump(scaler_params, f)
    
    print(f"Saved prepared data to {output_dir}/")
    print(f"  - X_train.npy: {X_train_scaled.shape}")
    print(f"  - X_test.npy: {X_test_scaled.shape}")
    print(f"  - y_train.npy: {y_train.shape}")
    print(f"  - y_test.npy: {y_test.shape}")
    print(f"  - feature_names.json")
    print(f"  - scaler_params.json")

# %% [markdown]
# ## 7. Quick Baseline Model

# %%
if df is not None:
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import accuracy_score, classification_report
    
    # Train a simple logistic regression as baseline
    baseline = LogisticRegression(max_iter=1000, random_state=42)
    baseline.fit(X_train_scaled, y_train)
    
    # Evaluate
    train_acc = accuracy_score(y_train, baseline.predict(X_train_scaled))
    test_acc = accuracy_score(y_test, baseline.predict(X_test_scaled))
    
    print("=== Baseline Model (Logistic Regression) ===")
    print(f"Train Accuracy: {train_acc:.4f}")
    print(f"Test Accuracy: {test_acc:.4f}")
    
    print("\nClassification Report (Test Set):")
    print(classification_report(y_test, baseline.predict(X_test_scaled)))

# %% [markdown]
# ## Summary
# 
# Data preparation complete! The prepared data files are saved in `artifacts/prepared_data/`.
# 
# **Next steps:**
# 1. Train Historical Model (`historical_model.py`)
# 2. Train Sentiment Model (`sentiment_model.py`)
# 3. Train Hybrid Model (`hybrid_model.py`)

# %%
print("\n" + "=" * 60)
print("DATA PREPARATION COMPLETE!")
print("=" * 60)
print("\nProceed to historical_model.py to train the Historical Model.")
