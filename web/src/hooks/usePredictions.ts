"use client";

import { useState, useEffect, useCallback } from 'react';

export interface Prediction {
  id: string;
  market_id: string;
  sport: string;
  event_name: string;
  predicted_outcome: string;
  historical_confidence: number;
  sentiment_confidence: number;
  hybrid_confidence: number;
  actual_outcome: string | null;
  is_correct: boolean | null;
  created_at: string;
  resolved_at: string | null;
}

interface PredictionStats {
  total: number;
  pending: number;
  resolved: number;
  correct: number;
  accuracy7d?: number;
  bySport?: Record<string, { total: number; correct: number }>;
}

interface PredictionsResponse {
  success: boolean;
  predictions: Prediction[];
  stats: PredictionStats;
  source: string;
  timestamp: string;
  error?: string;
}

interface UsePredictionsOptions {
  sport?: string;
  limit?: number;
  onlyResolved?: boolean;
  useMock?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function usePredictions(options: UsePredictionsOptions = {}) {
  const {
    sport,
    limit = 50,
    onlyResolved = false,
    useMock = false,
    autoRefresh = true,
    refreshInterval = 60000,
  } = options;

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [stats, setStats] = useState<PredictionStats>({ total: 0, pending: 0, resolved: 0, correct: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>('unknown');

  const fetchPredictions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        resolved: onlyResolved.toString(),
        mock: useMock.toString(),
      });
      
      if (sport) {
        params.set('sport', sport);
      }

      const response = await fetch(`/api/predictions?${params}`);
      const data: PredictionsResponse = await response.json();

      if (data.success) {
        setPredictions(data.predictions);
        setStats(data.stats);
        setSource(data.source);
      } else {
        setError(data.error || 'Failed to fetch predictions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [sport, limit, onlyResolved, useMock]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchPredictions, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchPredictions]);

  return {
    predictions,
    stats,
    loading,
    error,
    source,
    refresh: fetchPredictions,
  };
}

// Accuracy Metrics Types
interface ModelMetric {
  id: string;
  model_type: string;
  accuracy_7d: number;
  accuracy_30d: number;
  total_predictions: number;
  correct_predictions: number;
  updated_at: string;
}

interface AccuracyResponse {
  success: boolean;
  training: Record<string, { accuracy: number; auc: number }>;
  live: {
    total_predictions: number;
    correct_predictions: number;
    accuracy_7d: number;
    accuracy_by_sport: Record<string, { total: number; correct: number }>;
  };
  models: ModelMetric[];
  source: string;
  timestamp: string;
  error?: string;
}

export function useAccuracy() {
  const [training, setTraining] = useState<Record<string, { accuracy: number; auc: number }>>({});
  const [live, setLive] = useState<AccuracyResponse['live']>({
    total_predictions: 0,
    correct_predictions: 0,
    accuracy_7d: 0,
    accuracy_by_sport: {},
  });
  const [models, setModels] = useState<ModelMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccuracy = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/accuracy');
      const data: AccuracyResponse = await response.json();

      if (data.success) {
        setTraining(data.training);
        setLive(data.live);
        setModels(data.models);
      } else {
        setError(data.error || 'Failed to fetch accuracy');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccuracy();
  }, [fetchAccuracy]);

  return {
    training,
    live,
    models,
    loading,
    error,
    refresh: fetchAccuracy,
  };
}

// Helper to format confidence as percentage
export function formatConfidencePercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// Helper to get confidence level label
export function getConfidenceLevel(confidence: number): { label: string; color: string } {
  if (confidence >= 0.8) return { label: 'Very High', color: 'var(--neon-lime)' };
  if (confidence >= 0.65) return { label: 'High', color: '#4ade80' };
  if (confidence >= 0.5) return { label: 'Medium', color: '#fbbf24' };
  return { label: 'Low', color: '#f87171' };
}
