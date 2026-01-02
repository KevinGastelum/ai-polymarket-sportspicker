# %% [markdown]
# # 📊 Sentiment Model - AI PolyMarket Sports Picker
# 
# This notebook trains the **Sentiment Model** which uses market signals.
# 
# **Model Type:** Neural Network (good for capturing market sentiment patterns)
# 
# **Features:** Market prices, implied probabilities, trading volume
# 
# Since we don't have actual social media sentiment data, this model focuses on
# market-derived sentiment (prices reflect collective market opinion).
# 
# [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/YOUR_USERNAME/polymarket-predictor/blob/main/notebooks/sentiment_model.py)

# %% [markdown]
# ## 1. Setup

# %%
# Install dependencies (run in Colab)
# !pip install tensorflow scikit-learn pandas numpy matplotlib

# %%
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.metrics import (
    accuracy_score, 
    precision_score, 
    recall_score, 
    f1_score,
    roc_auc_score,
    confusion_matrix,
)
import json
import os

# TensorFlow/Keras for Neural Network
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    USE_TENSORFLOW = True
    print(f"TensorFlow version: {tf.__version__}")
    
    # Check GPU
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        print(f"GPU available: {gpus[0].name}")
    else:
        print("No GPU detected, using CPU")
except ImportError:
    from sklearn.neural_network import MLPClassifier
    USE_TENSORFLOW = False
    print("TensorFlow not available, using sklearn MLPClassifier")

# %% [markdown]
# ## 2. Load Prepared Data

# %%
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
# ## 3. Build Sentiment Neural Network

# %%
def build_sentiment_model(input_dim):
    """
    Build a simple neural network for sentiment-based prediction.
    
    Architecture:
    - Input layer
    - Dense(64) + BatchNorm + Dropout
    - Dense(32) + BatchNorm + Dropout
    - Output(1, sigmoid)
    """
    
    if USE_TENSORFLOW:
        model = keras.Sequential([
            # Input layer
            layers.Input(shape=(input_dim,)),
            
            # Hidden layer 1
            layers.Dense(64, activation='relu', kernel_regularizer=keras.regularizers.l2(0.01)),
            layers.BatchNormalization(),
            layers.Dropout(0.3),
            
            # Hidden layer 2
            layers.Dense(32, activation='relu', kernel_regularizer=keras.regularizers.l2(0.01)),
            layers.BatchNormalization(),
            layers.Dropout(0.3),
            
            # Hidden layer 3
            layers.Dense(16, activation='relu'),
            layers.Dropout(0.2),
            
            # Output layer
            layers.Dense(1, activation='sigmoid')
        ])
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy', keras.metrics.AUC(name='auc')]
        )
        
        return model
    else:
        # Fallback to sklearn
        return MLPClassifier(
            hidden_layer_sizes=(64, 32, 16),
            activation='relu',
            solver='adam',
            alpha=0.01,
            max_iter=500,
            random_state=42,
            verbose=True,
        )

# %%
if X_train is not None:
    model = build_sentiment_model(X_train.shape[1])
    
    if USE_TENSORFLOW:
        model.summary()

# %% [markdown]
# ## 4. Train Sentiment Model

# %%
def train_sentiment_model(model, X_train, y_train, X_test, y_test):
    """Train the sentiment model."""
    
    if USE_TENSORFLOW:
        # Callbacks
        callbacks = [
            keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=10,
                restore_best_weights=True,
                verbose=1
            ),
            keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=5,
                min_lr=1e-6,
                verbose=1
            ),
        ]
        
        # Train
        history = model.fit(
            X_train, y_train,
            validation_data=(X_test, y_test),
            epochs=100,
            batch_size=32,
            callbacks=callbacks,
            verbose=1,
        )
        
        return model, history
    else:
        # sklearn
        model.fit(X_train, y_train)
        return model, None

# %%
if X_train is not None:
    model, history = train_sentiment_model(model, X_train, y_train, X_test, y_test)

# %% [markdown]
# ## 5. Training History (TensorFlow only)

# %%
if X_train is not None and history is not None:
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    
    # Loss
    axes[0].plot(history.history['loss'], label='Train Loss')
    axes[0].plot(history.history['val_loss'], label='Val Loss')
    axes[0].set_title('Training Loss')
    axes[0].set_xlabel('Epoch')
    axes[0].set_ylabel('Loss')
    axes[0].legend()
    
    # Accuracy
    axes[1].plot(history.history['accuracy'], label='Train Accuracy')
    axes[1].plot(history.history['val_accuracy'], label='Val Accuracy')
    axes[1].set_title('Training Accuracy')
    axes[1].set_xlabel('Epoch')
    axes[1].set_ylabel('Accuracy')
    axes[1].legend()
    
    plt.tight_layout()
    
    os.makedirs('artifacts/models', exist_ok=True)
    plt.savefig('artifacts/models/sentiment_training_history.png', dpi=150)
    plt.show()

# %% [markdown]
# ## 6. Evaluate Sentiment Model

# %%
if X_train is not None:
    if USE_TENSORFLOW:
        y_pred_prob = model.predict(X_test).flatten()
        y_pred = (y_pred_prob > 0.5).astype(int)
    else:
        y_pred = model.predict(X_test)
        y_pred_prob = model.predict_proba(X_test)[:, 1]
    
    # Calculate metrics
    results = {
        'test_accuracy': accuracy_score(y_test, y_pred),
        'precision': precision_score(y_test, y_pred),
        'recall': recall_score(y_test, y_pred),
        'f1': f1_score(y_test, y_pred),
        'auc': roc_auc_score(y_test, y_pred_prob),
    }
    
    print("\n" + "=" * 50)
    print("SENTIMENT MODEL RESULTS")
    print("=" * 50)
    print(f"Test Accuracy:  {results['test_accuracy']:.4f}")
    print(f"Precision:      {results['precision']:.4f}")
    print(f"Recall:         {results['recall']:.4f}")
    print(f"F1 Score:       {results['f1']:.4f}")
    print(f"AUC-ROC:        {results['auc']:.4f}")

# %% [markdown]
# ## 7. Confusion Matrix

# %%
if X_train is not None:
    cm = confusion_matrix(y_test, y_pred)
    
    plt.figure(figsize=(8, 6))
    plt.imshow(cm, cmap='Greens')
    plt.title('Sentiment Model - Confusion Matrix')
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    plt.xticks([0, 1], ['Away Win', 'Home Win'])
    plt.yticks([0, 1], ['Away Win', 'Home Win'])
    plt.colorbar()
    
    for i in range(2):
        for j in range(2):
            plt.text(j, i, str(cm[i, j]), ha='center', va='center', fontsize=20, color='white' if cm[i, j] > cm.max()/2 else 'black')
    
    plt.tight_layout()
    plt.savefig('artifacts/models/sentiment_confusion_matrix.png', dpi=150)
    plt.show()

# %% [markdown]
# ## 8. Save Model

# %%
if X_train is not None:
    model_dir = 'artifacts/models'
    os.makedirs(model_dir, exist_ok=True)
    
    if USE_TENSORFLOW:
        # Save Keras model
        model.save(f'{model_dir}/sentiment_model.keras')
        print(f"Model saved to {model_dir}/sentiment_model.keras")
        
        # Also save as SavedModel format for deployment
        model.save(f'{model_dir}/sentiment_model_saved')
        print(f"SavedModel saved to {model_dir}/sentiment_model_saved/")
    else:
        import joblib
        joblib.dump(model, f'{model_dir}/sentiment_model.joblib')
        print(f"Model saved to {model_dir}/sentiment_model.joblib")
    
    # Save metrics
    with open(f'{model_dir}/sentiment_metrics.json', 'w') as f:
        json.dump(results, f, indent=2)
    print(f"Metrics saved to {model_dir}/sentiment_metrics.json")

# %% [markdown]
# ## 9. Prediction Function

# %%
def predict_sentiment(market_features, model):
    """
    Make a prediction using the sentiment model.
    
    Args:
        market_features: Dictionary or array of market features
        model: Trained sentiment model
        
    Returns:
        probability: Float between 0 and 1 (home win probability)
    """
    if isinstance(market_features, dict):
        # Convert to array in correct order
        # (Would need feature_names to do this properly)
        features = np.array([list(market_features.values())])
    else:
        features = np.array(market_features).reshape(1, -1)
    
    if USE_TENSORFLOW:
        prob = model.predict(features, verbose=0).flatten()[0]
    else:
        prob = model.predict_proba(features)[0, 1]
    
    return float(prob)

# Example usage
if X_train is not None:
    sample = X_test[0]
    prob = predict_sentiment(sample, model)
    actual = y_test[0]
    
    print(f"\nSample Prediction:")
    print(f"  Predicted probability (home win): {prob:.4f}")
    print(f"  Prediction: {'Home Win' if prob > 0.5 else 'Away Win'}")
    print(f"  Actual: {'Home Win' if actual == 1 else 'Away Win'}")

# %% [markdown]
# ## Summary
# 
# The Sentiment Model is trained and saved!
# 
# **Key Insights:**
# - Uses market prices as proxy for collective sentiment
# - Neural network captures non-linear patterns
# - May be more adaptive to changing market conditions
# 
# **Next:** Run `hybrid_model.py` to combine both models!

# %%
print("\n" + "=" * 60)
print("SENTIMENT MODEL TRAINING COMPLETE!")
print("=" * 60)
print(f"\nModel saved to: artifacts/models/sentiment_model.*")
print("Proceed to hybrid_model.py to train the Hybrid Model.")
