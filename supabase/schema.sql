-- ============================================
-- POLYMARKET SPORTS PICKER - DATABASE SCHEMA
-- ============================================
-- Run this in Supabase SQL Editor

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

-- Model performance summary
CREATE OR REPLACE VIEW model_performance AS
SELECT 
    model_type,
    accuracy_7d,
    accuracy_30d,
    total_predictions,
    correct_predictions,
    ROUND(correct_predictions::numeric / NULLIF(total_predictions, 0) * 100, 2) as overall_accuracy_pct,
    updated_at
FROM model_metrics;
