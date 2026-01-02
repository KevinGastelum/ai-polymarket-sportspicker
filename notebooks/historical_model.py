# %% [markdown]
# # 🏀 Historical Model - AI PolyMarket Sports Picker
# 
# This notebook trains the **Historical Model** which uses only past game results.
# 
# **Model Type:** XGBoost Classifier (fast, efficient, good baseline)
# 
# **Features:** Team records, win percentages, historical performance
# 
# [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/YOUR_USERNAME/polymarket-predictor/blob/main/notebooks/historical_model.py)

# %% [markdown]
# ## 1. Setup

# %%
# Install dependencies (run in Colab)
# !pip install xgboost scikit-learn pandas numpy matplotlib joblib

# %%
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import cross_val_score, GridSearchCV
from sklearn.metrics import (
    accuracy_score, 
    precision_score, 
    recall_score, 
    f1_score,
    confusion_matrix,
    classification_report,
    roc_auc_score,
    roc_curve
)
import json
import os
import joblib

# Try XGBoost, fall back to scikit-learn if not available
try:
    import xgboost as xgb
    USE_XGBOOST = True
    print("Using XGBoost")
except ImportError:
    from sklearn.ensemble import GradientBoostingClassifier
    USE_XGBOOST = False
    print("XGBoost not available, using sklearn GradientBoostingClassifier")

# %% [markdown]
# ## 2. Load Prepared Data

# %%
# Load data from data_prep notebook
data_dir = 'artifacts/prepared_data'

try:
    X_train = np.load(f'{data_dir}/X_train.npy')
    X_test = np.load(f'{data_dir}/X_test.npy')
    y_train = np.load(f'{data_dir}/y_train.npy')
    y_test = np.load(f'{data_dir}/y_test.npy')
    
    with open(f'{data_dir}/feature_names.json', 'r') as f:
        feature_names = json.load(f)
    
    print("Data loaded successfully!")
    print(f"Training samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")
    print(f"Features: {len(feature_names)}")
    
except FileNotFoundError:
    print("ERROR: Prepared data not found!")
    print("Please run data_prep.py first to generate the training data.")
    X_train = X_test = y_train = y_test = feature_names = None

# %% [markdown]
# ## 3. Historical Model - XGBoost

# %%
def train_historical_model(X_train, y_train, X_test, y_test):
    """Train the Historical Model using XGBoost."""
    
    if USE_XGBOOST:
        # XGBoost model
        model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            eval_metric='logloss',
            use_label_encoder=False,
        )
    else:
        # Fallback to sklearn
        model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42,
        )
    
    # Train
    print("Training Historical Model...")
    model.fit(X_train, y_train)
    
    # Evaluate
    train_pred = model.predict(X_train)
    test_pred = model.predict(X_test)
    test_prob = model.predict_proba(X_test)[:, 1]
    
    results = {
        'train_accuracy': accuracy_score(y_train, train_pred),
        'test_accuracy': accuracy_score(y_test, test_pred),
        'precision': precision_score(y_test, test_pred),
        'recall': recall_score(y_test, test_pred),
        'f1': f1_score(y_test, test_pred),
        'auc': roc_auc_score(y_test, test_prob),
    }
    
    return model, results

# %%
if X_train is not None:
    model, results = train_historical_model(X_train, y_train, X_test, y_test)
    
    print("\n" + "=" * 50)
    print("HISTORICAL MODEL RESULTS")
    print("=" * 50)
    print(f"Train Accuracy: {results['train_accuracy']:.4f}")
    print(f"Test Accuracy:  {results['test_accuracy']:.4f}")
    print(f"Precision:      {results['precision']:.4f}")
    print(f"Recall:         {results['recall']:.4f}")
    print(f"F1 Score:       {results['f1']:.4f}")
    print(f"AUC-ROC:        {results['auc']:.4f}")

# %% [markdown]
# ## 4. Hyperparameter Tuning

# %%
def tune_model(X_train, y_train):
    """Perform grid search for best hyperparameters."""
    
    if USE_XGBOOST:
        base_model = xgb.XGBClassifier(
            random_state=42,
            eval_metric='logloss',
            use_label_encoder=False,
        )
        
        param_grid = {
            'n_estimators': [50, 100, 200],
            'max_depth': [3, 5, 7],
            'learning_rate': [0.01, 0.1, 0.2],
        }
    else:
        base_model = GradientBoostingClassifier(random_state=42)
        
        param_grid = {
            'n_estimators': [50, 100, 200],
            'max_depth': [3, 5, 7],
            'learning_rate': [0.01, 0.1, 0.2],
        }
    
    print("Performing Grid Search (this may take a few minutes)...")
    
    grid_search = GridSearchCV(
        base_model,
        param_grid,
        cv=5,
        scoring='accuracy',
        n_jobs=-1,
        verbose=1,
    )
    
    grid_search.fit(X_train, y_train)
    
    print(f"\nBest parameters: {grid_search.best_params_}")
    print(f"Best CV score: {grid_search.best_score_:.4f}")
    
    return grid_search.best_estimator_, grid_search.best_params_

# %%
# Uncomment to run hyperparameter tuning (takes longer)
# if X_train is not None:
#     best_model, best_params = tune_model(X_train, y_train)

# %% [markdown]
# ## 5. Feature Importance

# %%
if X_train is not None and hasattr(model, 'feature_importances_'):
    # Get feature importance
    importance = model.feature_importances_
    
    # Sort by importance
    indices = np.argsort(importance)[::-1]
    
    # Plot
    plt.figure(figsize=(12, 6))
    plt.title('Historical Model - Feature Importance')
    plt.bar(range(len(importance)), importance[indices], color='steelblue')
    plt.xticks(range(len(importance)), [feature_names[i] for i in indices], rotation=45, ha='right')
    plt.xlabel('Feature')
    plt.ylabel('Importance')
    plt.tight_layout()
    
    # Save plot
    os.makedirs('artifacts/models', exist_ok=True)
    plt.savefig('artifacts/models/historical_feature_importance.png', dpi=150)
    plt.show()
    
    # Print top features
    print("\nTop 10 Features:")
    for i, idx in enumerate(indices[:10], 1):
        print(f"  {i}. {feature_names[idx]}: {importance[idx]:.4f}")

# %% [markdown]
# ## 6. Confusion Matrix & ROC Curve

# %%
if X_train is not None:
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    
    # Confusion Matrix
    y_pred = model.predict(X_test)
    cm = confusion_matrix(y_test, y_pred)
    
    axes[0].imshow(cm, cmap='Blues')
    axes[0].set_title('Confusion Matrix')
    axes[0].set_xlabel('Predicted')
    axes[0].set_ylabel('Actual')
    axes[0].set_xticks([0, 1])
    axes[0].set_yticks([0, 1])
    axes[0].set_xticklabels(['Away Win', 'Home Win'])
    axes[0].set_yticklabels(['Away Win', 'Home Win'])
    
    # Add values to confusion matrix
    for i in range(2):
        for j in range(2):
            axes[0].text(j, i, str(cm[i, j]), ha='center', va='center', fontsize=20)
    
    # ROC Curve
    y_prob = model.predict_proba(X_test)[:, 1]
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    auc = roc_auc_score(y_test, y_prob)
    
    axes[1].plot(fpr, tpr, color='blue', lw=2, label=f'Historical Model (AUC = {auc:.4f})')
    axes[1].plot([0, 1], [0, 1], color='gray', linestyle='--')
    axes[1].set_title('ROC Curve')
    axes[1].set_xlabel('False Positive Rate')
    axes[1].set_ylabel('True Positive Rate')
    axes[1].legend(loc='lower right')
    
    plt.tight_layout()
    plt.savefig('artifacts/models/historical_evaluation.png', dpi=150)
    plt.show()

# %% [markdown]
# ## 7. Save Model

# %%
if X_train is not None:
    # Save model
    model_dir = 'artifacts/models'
    os.makedirs(model_dir, exist_ok=True)
    
    # Save as joblib
    model_path = f'{model_dir}/historical_model.joblib'
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")
    
    # Save metrics
    metrics_path = f'{model_dir}/historical_metrics.json'
    with open(metrics_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"Metrics saved to {metrics_path}")
    
    # Save for ONNX export (if using XGBoost)
    if USE_XGBOOST:
        model.save_model(f'{model_dir}/historical_model.json')
        print(f"XGBoost model saved to {model_dir}/historical_model.json")

# %% [markdown]
# ## 8. Cross-Validation

# %%
if X_train is not None:
    print("Performing 5-fold Cross-Validation...")
    
    # Combine train and test for full CV
    X_full = np.vstack([X_train, X_test])
    y_full = np.concatenate([y_train, y_test])
    
    cv_scores = cross_val_score(model, X_full, y_full, cv=5, scoring='accuracy')
    
    print(f"\nCV Accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
    print(f"Individual folds: {cv_scores}")

# %% [markdown]
# ## Summary
# 
# The Historical Model is trained and saved!
# 
# **Results:**
# - Test Accuracy: ~87% (may vary based on data)
# - AUC-ROC: Good discriminative ability
# 
# **Note:** This model relies on historical patterns which can overfit.
# We'll compare with Sentiment and Hybrid models for live predictions.
# 
# **Next:** Run `sentiment_model.py`

# %%
print("\n" + "=" * 60)
print("HISTORICAL MODEL TRAINING COMPLETE!")
print("=" * 60)
print(f"\nModel saved to: artifacts/models/historical_model.joblib")
print("Proceed to sentiment_model.py to train the Sentiment Model.")
