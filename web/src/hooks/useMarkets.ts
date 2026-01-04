"use client";

import { useState, useEffect, useCallback } from 'react';

export interface SportMarket {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  sport: string;
  endDate: string;
}

interface MarketsResponse {
  success: boolean;
  count: number;
  markets: SportMarket[];
  timestamp: string;
  error?: string;
}

interface UseMarketsOptions {
  sport?: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function useMarkets(options: UseMarketsOptions = {}) {
  const {
    sport = 'all',
    limit = 50,
    autoRefresh = true,
    refreshInterval = Number(process.env.NEXT_PUBLIC_MARKET_REFRESH_INTERVAL) || 60000, // Default to env or 1 minute
  } = options;

  const [markets, setMarkets] = useState<SportMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMarkets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        sport,
        limit: limit.toString(),
      });

      const response = await fetch(`/api/markets?${params}`);
      const data: MarketsResponse = await response.json();

      if (data.success) {
        setMarkets(data.markets);
        setLastUpdated(new Date(data.timestamp));
      } else {
        setError(data.error || 'Failed to fetch markets');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [sport, limit]);

  // Initial fetch
  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchMarkets, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchMarkets]);

  return {
    markets,
    loading,
    error,
    lastUpdated,
    refresh: fetchMarkets,
  };
}

// Helper to get sport emoji
export function getSportEmoji(sport: string): string {
  const emojis: Record<string, string> = {
    nfl: '🏈',
    nba: '🏀',
    nhl: '🏒',
    mlb: '⚾',
    mma: '🥊',
    soccer: '⚽',
    other: '🎯',
  };
  return emojis[sport] || '🎯';
}

// Helper to format confidence
export function formatConfidence(price: number): string {
  return `${(price * 100).toFixed(1)}%`;
}

// Helper to determine prediction
export function getPrediction(market: SportMarket): { pick: string; confidence: number } {
  if (market.yesPrice > market.noPrice) {
    return { pick: 'YES', confidence: market.yesPrice };
  }
  return { pick: 'NO', confidence: market.noPrice };
}
