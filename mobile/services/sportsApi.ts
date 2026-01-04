/**
 * Polymarket Sports API Service for React Native
 * 
 * Mobile-compatible fetcher for all sports markets.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// Types
// ============================================================================

export type SportCategory = 
  | 'all'
  | 'nba' 
  | 'nfl' 
  | 'soccer' 
  | 'golf' 
  | 'mma' 
  | 'tennis' 
  | 'ncaa'
  | 'hockey'
  | 'baseball'
  | 'f1'
  | 'esports'
  | 'cricket'
  | 'chess'
  | 'boxing'
  | 'rugby';

export type MarketType = 'moneyline' | 'spread' | 'futures' | 'prop' | 'other';
export type MarketStatus = 'live' | 'upcoming' | 'closed';

export interface Outcome {
  name: string;
  price: number;
  tokenId?: string;
}

export interface SportsMarket {
  id: string;
  eventId: string;
  sport: SportCategory;
  type: MarketType;
  status: MarketStatus;
  title: string;
  question: string;
  description: string;
  outcomes: Outcome[];
  spreadValue?: number;
  volume: number;
  liquidity: number;
  startDate: string;
  endDate: string;
  image?: string;
  seriesSlug?: string;
}

export interface FetchSportsMarketsOptions {
  sport?: SportCategory;
  status?: MarketStatus;
  limit?: number;
  offset?: number;
  useCache?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';
const CACHE_KEY = 'polymarket_sports_cache';
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

const SPORT_TAGS: Record<SportCategory, string[]> = {
  all: [],
  nba: ['nba'],
  nfl: ['nfl'],
  soccer: ['soccer', 'ucl', 'epl', 'world-cup', 'mls'],
  golf: ['golf', 'pga'],
  mma: ['mma', 'ufc'],
  tennis: ['tennis', 'atp', 'wta'],
  ncaa: ['ncaa', 'march-madness'],
  hockey: ['nhl', 'hockey'],
  baseball: ['mlb', 'baseball'],
  f1: ['formula-1', 'f1', 'racing'],
  esports: ['esports', 'league-of-legends', 'dota-2', 'csgo', 'gaming'],
  cricket: ['cricket', 'ipl'],
  chess: ['chess'],
  boxing: ['boxing'],
  rugby: ['rugby'],
};

export const SPORT_ICONS: Record<SportCategory, string> = {
  all: '🏆',
  nba: '🏀',
  nfl: '🏈',
  soccer: '⚽',
  golf: '⛳',
  mma: '🥊',
  tennis: '🎾',
  ncaa: '🎓',
  hockey: '🏒',
  baseball: '⚾',
  f1: '🏎️',
  esports: '🎮',
  cricket: '🏏',
  chess: '♟️',
  boxing: '🥊',
  rugby: '🏉',
};

export const SPORT_CATEGORIES: { id: SportCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '🏆' },
  { id: 'nba', label: 'NBA', icon: '🏀' },
  { id: 'nfl', label: 'NFL', icon: '🏈' },
  { id: 'soccer', label: 'Soccer', icon: '⚽' },
  { id: 'golf', label: 'Golf', icon: '⛳' },
  { id: 'mma', label: 'MMA', icon: '🥊' },
  { id: 'tennis', label: 'Tennis', icon: '🎾' },
  { id: 'ncaa', label: 'NCAA', icon: '🎓' },
  { id: 'hockey', label: 'NHL', icon: '🏒' },
  { id: 'baseball', label: 'MLB', icon: '⚾' },
  { id: 'f1', label: 'F1', icon: '🏎️' },
  { id: 'esports', label: 'Esports', icon: '🎮' },
  { id: 'cricket', label: 'Cricket', icon: '🏏' },
  { id: 'chess', label: 'Chess', icon: '♟️' },
  { id: 'boxing', label: 'Boxing', icon: '🥊' },
  { id: 'rugby', label: 'Rugby', icon: '🏉' },
];

// ============================================================================
// Helper Functions
// ============================================================================

function detectSport(seriesSlug?: string, tags?: string[]): SportCategory {
  const slugLower = seriesSlug?.toLowerCase() || '';
  const allTags = tags?.map(t => t.toLowerCase()) || [];
  
  for (const [sport, sportTags] of Object.entries(SPORT_TAGS)) {
    if (sport === 'all') continue;
    if (sportTags.some(tag => slugLower.includes(tag) || allTags.includes(tag))) {
      return sport as SportCategory;
    }
  }
  
  return 'all';
}

function detectMarketType(title: string, description: string): MarketType {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('by more than') || text.includes('by over') || /\d+\.?\d*\s*points/.test(text)) {
    return 'spread';
  }
  
  if (text.includes('championship') || text.includes('winner') || text.includes('mvp') || 
      text.includes('finals') || text.includes('super bowl')) {
    return 'futures';
  }
  
  if (text.includes('draft') || text.includes('first pick') || text.includes('total')) {
    return 'prop';
  }
  
  return 'moneyline';
}

function extractSpreadValue(title: string): number | undefined {
  const match = title.match(/(\d+\.?\d*)\s*(?:points|pts)?/i);
  return match ? parseFloat(match[1]) : undefined;
}

function detectStatus(closed: boolean, endDate: string): MarketStatus {
  if (closed) return 'closed';
  const now = new Date();
  const end = new Date(endDate);
  if (end < now) return 'live';
  return 'upcoming';
}

function parseOutcomes(market: any): Outcome[] {
  try {
    const names = JSON.parse(market.outcomes || '[]');
    const prices = JSON.parse(market.outcomePrices || '[]');
    const tokenIds = JSON.parse(market.clobTokenIds || '[]');
    
    return names.map((name: string, i: number) => ({
      name,
      price: parseFloat(prices[i] || '0.5'),
      tokenId: tokenIds[i],
    }));
  } catch {
    return [];
  }
}

// ============================================================================
// Cache Functions
// ============================================================================

interface CacheEntry {
  data: SportsMarket[];
  timestamp: number;
  options: string;
}

async function getCachedData(optionsKey: string): Promise<SportsMarket[] | null> {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_KEY}_${optionsKey}`);
    if (!cached) return null;
    
    const entry: CacheEntry = JSON.parse(cached);
    const isExpired = Date.now() - entry.timestamp > CACHE_TTL_MS;
    
    return isExpired ? null : entry.data;
  } catch {
    return null;
  }
}

async function setCachedData(optionsKey: string, data: SportsMarket[]): Promise<void> {
  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      options: optionsKey,
    };
    await AsyncStorage.setItem(`${CACHE_KEY}_${optionsKey}`, JSON.stringify(entry));
  } catch {
    // Silently fail cache write
  }
}

// ============================================================================
// API Functions
// ============================================================================

export async function fetchSportsMarkets(
  options: FetchSportsMarketsOptions = {}
): Promise<SportsMarket[]> {
  const { sport = 'all', status, limit = 50, offset = 0, useCache = true } = options;
  
  const optionsKey = `${sport}_${status || 'all'}_${limit}_${offset}`;
  
  // Check cache
  if (useCache) {
    const cached = await getCachedData(optionsKey);
    if (cached) return cached;
  }
  
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  
  if (status === 'closed') {
    params.set('closed', 'true');
  } else if (status === 'live' || status === 'upcoming') {
    params.set('closed', 'false');
    params.set('active', 'true');
  }
  
  if (sport !== 'all' && SPORT_TAGS[sport]?.length > 0) {
    params.set('tag_slug', SPORT_TAGS[sport][0]);
  }
  
  try {
    const response = await fetch(`${GAMMA_API_BASE}/events?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const events = await response.json();
    const markets: SportsMarket[] = [];
    
    for (const event of events) {
      const seriesSlug = event.series?.[0]?.slug || event.seriesSlug;
      const detectedSport = detectSport(seriesSlug, event.tags?.map((t: any) => t.slug));
      
      if (sport !== 'all' && detectedSport !== sport) continue;
      if (!event.markets?.length) continue;
      
      for (const market of event.markets) {
        const marketType = detectMarketType(market.question || event.title, market.description || '');
        const marketStatus = detectStatus(market.closed, market.endDate || event.endDate);
        
        if (status && marketStatus !== status) continue;
        
        markets.push({
          id: market.id,
          eventId: event.id,
          sport: detectedSport,
          type: marketType,
          status: marketStatus,
          title: event.title,
          question: market.question || event.title,
          description: market.description || event.description || '',
          outcomes: parseOutcomes(market),
          spreadValue: marketType === 'spread' ? extractSpreadValue(market.question || event.title) : undefined,
          volume: parseFloat(market.volume || '0'),
          liquidity: parseFloat(market.liquidity || '0'),
          startDate: market.startDate || event.startDate,
          endDate: market.endDate || event.endDate,
          image: event.image || market.image,
          seriesSlug,
        });
      }
    }
    
    // Cache result
    if (useCache) {
      await setCachedData(optionsKey, markets);
    }
    
    return markets;
  } catch (error) {
    console.error('Error fetching sports markets:', error);
    return [];
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getSportIcon(sport: SportCategory): string {
  return SPORT_ICONS[sport] || '🏆';
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
}

export function formatProbability(price: number): string {
  return `${Math.round(price * 100)}%`;
}

export function getTimeUntil(endDate: string): string {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff < 0) return 'Live';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  
  const mins = Math.floor(diff / (1000 * 60));
  return `${mins}m`;
}
