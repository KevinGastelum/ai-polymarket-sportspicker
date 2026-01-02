# Supabase Setup Guide for AI PolyMarket Sports Picker

This guide will help you set up Supabase as the backend database for tracking predictions and model accuracy.

## 1. Create a Free Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click "New Project"
3. Choose your organization (or create one)
4. Enter project details:
   - **Name**: `polymarket-predictor`
   - **Database Password**: (choose a strong password)
   - **Region**: Choose closest to you
5. Click "Create new project" and wait ~2 minutes

## 2. Get Your API Credentials

Once the project is created:

1. Go to **Settings** (gear icon) → **API**
2. Copy these values:
   - **Project URL**: `https://YOUR_PROJECT_ID.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIs...` (long JWT token)

3. Create a `.env` file in your project root:

```env
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_KEY=your_anon_public_key_here
```

## 3. Run the Database Schema

1. Go to **SQL Editor** in the Supabase dashboard
2. Click **+ New query**
3. Paste the following SQL and click **Run**:

```sql
-- ============================================
-- PREDICTIONS TABLE
-- ============================================
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

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_predictions_sport ON predictions(sport);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_is_correct ON predictions(is_correct);

-- ============================================
-- MODEL METRICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS model_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_type TEXT UNIQUE NOT NULL,
    accuracy_7d FLOAT DEFAULT 0.0,
    accuracy_30d FLOAT DEFAULT 0.0,
    total_predictions INT DEFAULT 0,
    correct_predictions INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial metric rows
INSERT INTO model_metrics (model_type, accuracy_7d, accuracy_30d, total_predictions)
VALUES 
    ('historical', 0.0, 0.0, 0),
    ('sentiment', 0.0, 0.0, 0),
    ('hybrid', 0.0, 0.0, 0)
ON CONFLICT (model_type) DO NOTHING;

-- ============================================
-- MARKET CACHE TABLE
-- ============================================
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

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- Rolling accuracy view
CREATE OR REPLACE VIEW rolling_accuracy AS
SELECT 
    sport,
    COUNT(*) as total_predictions,
    SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct,
    ROUND(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as accuracy_pct
FROM predictions
WHERE resolved_at IS NOT NULL
GROUP BY sport;

-- Recent predictions view
CREATE OR REPLACE VIEW recent_predictions AS
SELECT 
    id,
    sport,
    event_name,
    predicted_outcome,
    ROUND(hybrid_confidence * 100, 1) as confidence_pct,
    actual_outcome,
    is_correct,
    created_at
FROM predictions
ORDER BY created_at DESC
LIMIT 50;
```

## 4. Install Python Dependencies

```bash
pip install supabase python-dotenv
```

## 5. Test the Connection

Update your `.env` file with the credentials, then run:

```python
from dotenv import load_dotenv
import os

load_dotenv()

from src.tools.supabase_client import SupabaseClient

client = SupabaseClient()

if client.is_connected:
    print("✅ Connected to Supabase!")
else:
    print("❌ Not connected. Check your credentials.")
```

## 6. Enable Row-Level Security (Optional)

For production, you may want to enable RLS:

```sql
-- Enable RLS
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read" ON predictions FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON model_metrics FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON market_cache FOR SELECT USING (true);

-- Allow authenticated insert/update
CREATE POLICY "Allow authenticated write" ON predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON predictions FOR UPDATE USING (true);
```

## 7. Free Tier Limits

Supabase free tier includes:
- **500MB** database storage
- **1GB** file storage
- **50,000** monthly active users
- **2GB** bandwidth

This is plenty for our prediction tracking needs!

## Next Steps

1. ✅ Test connection: `python src/tools/supabase_client.py`
2. Start logging predictions
3. Build the dashboard to display accuracy metrics
