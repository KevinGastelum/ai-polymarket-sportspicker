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

// API Base URL - change this to your deployed URL or localhost for development
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.68:3000' // Local network IP for development
  : 'https://your-vercel-app.vercel.app'; // Production URL

interface UseMarketsOptions {
  sport?: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useMarkets(options: UseMarketsOptions = {}) {
  const {
    sport = 'all',
    limit = 50,
    autoRefresh = true,
    refreshInterval = 60000,
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

      const response = await fetch(`${API_BASE_URL}/api/markets?${params}`);
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

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

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

// Get prediction from market prices
export function getPrediction(market: SportMarket): { pick: string; confidence: number } {
  if (market.yesPrice > market.noPrice) {
    return { pick: 'YES', confidence: market.yesPrice };
  }
  return { pick: 'NO', confidence: market.noPrice };
}
