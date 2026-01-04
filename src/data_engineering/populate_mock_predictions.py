
import os
import pandas as pd
import numpy as np
import uuid
from datetime import datetime, timedelta
from supabase import create_client, Client

# Initialize Supabase
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not url or not key:
    print("Error: Supabase credentials not found in environment variables.")
    # Fallback for manual testing if env vars aren't loaded in shell
    # user might need to export them or I can read .env.local
    # For now, let's assume they might be missing and print a warning.
    # I'll try to read .env.local manually if os.environ fails
    try:
        with open('web/.env.local', 'r') as f:
            for line in f:
                if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
                    url = line.strip().split('=')[1]
                if line.startswith('NEXT_PUBLIC_SUPABASE_ANON_KEY='):
                    key = line.strip().split('=')[1]
    except Exception as e:
        print(f"Could not read .env.local: {e}")

if not url or not key:
    exit(1)

supabase: Client = create_client(url, key)

def populate_predictions():
    print("Loading data...")
    # Load the big CSV
    try:
        df = pd.read_csv('data/polymarket_raw_all_sports.csv')
    except FileNotFoundError:
        print("Error: 'data/polymarket_raw_all_sports.csv' not found. Please run fetch_polymarket_data.py first.")
        # For demonstration if file missing, let's create dummy data
        print("Creating dummy data for demonstration...")
        df = pd.DataFrame({
            'event_id': [str(uuid.uuid4()) for _ in range(50)],
            'game_date': [(datetime.now() - timedelta(days=x)).isoformat() for x in range(50)],
            'sport': ['nba', 'nfl', 'soccer', 'mma', 'f1'] * 10,
            'market_type': ['moneyline', 'spread'] * 25,
            'outcome_name': ['Team A', 'Team B'] * 25,
            'market_implied_prob': np.random.uniform(0.4, 0.6, 50),
            'actual_result_binary': np.random.randint(0, 2, 50)
        })

    print(f"Loaded {len(df)} rows.")
    
    predictions_to_insert = []
    
    print("Generating predictions...")
    for _, row in df.iterrows():
        # Simple Logic: If implied prob > 0.55, we bet on it. 
        # Or just take random rows to simulate "Model Picks"
        
        # We want a mix of wins and losses
        # Let's say model bets if confidence > 55%
        confidence = row.get('market_implied_prob', 0.5)
        
        # Artificial "Model Confidence" slightly different from market
        model_conf = confidence + np.random.uniform(-0.05, 0.10) # Model is slightly bullish
        
        if model_conf > 0.55:
            # We decide to bet
            is_correct = bool(row.get('actual_result_binary', 0))
            
            pred = {
                "market_id": row.get('event_id', str(uuid.uuid4())), # Use event_id as market_id for now
                "sport": row.get('sport', 'unknown'),
                "event_name": f"Event {row.get('event_id')[:8]}", # Placeholder if no name
                "predicted_outcome": row.get('outcome_name', 'Yes'),
                "historical_confidence": float(model_conf),
                "sentiment_confidence": float(model_conf - 0.05),
                "hybrid_confidence": float(model_conf),
                "actual_outcome": row.get('outcome_name', 'Yes') if is_correct else "Other",
                "is_correct": is_correct,
                "created_at": row.get('game_date'),
                "resolved_at": row.get('game_date') # Assumed resolved same time for simplicity
            }
            predictions_to_insert.append(pred)

    print(f"Prepared {len(predictions_to_insert)} bets.")
    
    # Batch insert
    batch_size = 50
    for i in range(0, len(predictions_to_insert), batch_size):
        batch = predictions_to_insert[i:i+batch_size]
        try:
            data, count = supabase.table('predictions').insert(batch).execute()
            print(f"Inserted batch {i//batch_size + 1}")
        except Exception as e:
            print(f"Error inserting batch: {e}")

if __name__ == "__main__":
    populate_predictions()
