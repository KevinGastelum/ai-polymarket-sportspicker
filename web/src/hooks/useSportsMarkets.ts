"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  SportsMarket,
  SportCategory,
  MarketStatus,
  fetchSportsMarkets,
  FetchSportsMarketsOptions,
} from '@/lib/polymarket-sports';

export interface UseSportsMarketsOptions {
  sport?: SportCategory;
  status?: MarketStatus;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useSportsMarkets(options: UseSportsMarketsOptions = {}) {
  const {
    sport = 'all',
    status,
    limit = 50,
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds for live updates
  } = options;

  const [markets, setMarkets] = useState<SportsMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMarkets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const fetchOptions: FetchSportsMarketsOptions = {
        sport,
        status,
        limit,
      };

      const data = await fetchSportsMarkets(fetchOptions);
      setMarkets(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch markets');
    } finally {
      setLoading(false);
    }
  }, [sport, status, limit]);

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

  // Derived data
  const liveMarkets = markets.filter(m => m.status === 'live');
  const upcomingMarkets = markets.filter(m => m.status === 'upcoming');
  const closedMarkets = markets.filter(m => m.status === 'closed');

  // Group by sport
  const marketsBySport = markets.reduce((acc, market) => {
    const sportKey = market.sport;
    if (!acc[sportKey]) acc[sportKey] = [];
    acc[sportKey].push(market);
    return acc;
  }, {} as Record<SportCategory, SportsMarket[]>);

  return {
    markets,
    liveMarkets,
    upcomingMarkets,
    closedMarkets,
    marketsBySport,
    loading,
    error,
    lastUpdated,
    refresh: fetchMarkets,
  };
}

export { SportsMarket, SportCategory, MarketStatus } from '@/lib/polymarket-sports';
export { getSportCategories, getSportIcon, formatVolume, formatProbability } from '@/lib/polymarket-sports';
