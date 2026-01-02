import { NextResponse } from 'next/server';

// Gamma API for live Polymarket data
const GAMMA_API_URL = 'https://gamma-api.polymarket.com/markets';

interface PolymarketMarket {
  id: string;
  question: string;
  outcomePrices: string;
  volume: number;
  liquidity: number;
  endDate: string;
  image?: string;
  icon?: string;
}

interface SportMarket {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  sport: string;
  endDate: string;
}

// Sport detection keywords
const SPORT_KEYWORDS: Record<string, string[]> = {
  nfl: ['nfl', 'super bowl', 'touchdown', 'quarterback', 'chiefs', 'ravens', 'eagles', 'bills', 'lions', 'vikings', 'packers', 'cowboys', 'steelers', '49ers', 'seahawks', 'afc', 'nfc'],
  nba: ['nba', 'lakers', 'celtics', 'warriors', 'nuggets', 'thunder', 'cavaliers', 'knicks', 'nets', 'bucks', 'heat', 'basketball'],
  nhl: ['nhl', 'stanley cup', 'hockey', 'rangers', 'penguins', 'bruins', 'golden knights'],
  mlb: ['mlb', 'baseball', 'yankees', 'dodgers', 'world series'],
  mma: ['ufc', 'mma', 'mcgregor', 'jon jones', 'fight'],
  soccer: ['world cup', 'fifa', 'premier league', 'champions league', 'soccer', 'football'],
};

function detectSport(question: string): string {
  const q = question.toLowerCase();
  for (const [sport, keywords] of Object.entries(SPORT_KEYWORDS)) {
    if (keywords.some(kw => q.includes(kw))) {
      return sport;
    }
  }
  return 'other';
}

function parsePrices(pricesRaw: string | string[]): { yes: number; no: number } {
  try {
    const prices = typeof pricesRaw === 'string' ? JSON.parse(pricesRaw) : pricesRaw;
    if (Array.isArray(prices) && prices.length >= 2) {
      return {
        yes: parseFloat(prices[0]) || 0,
        no: parseFloat(prices[1]) || 0,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return { yes: 0, no: 0 };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Fetch from Gamma API
    const markets: SportMarket[] = [];
    
    for (const offset of [0, 100, 200]) {
      const response = await fetch(
        `${GAMMA_API_URL}?active=true&closed=false&limit=100&offset=${offset}`,
        { next: { revalidate: 60 } } // Cache for 60 seconds
      );

      if (!response.ok) continue;

      const data: PolymarketMarket[] = await response.json();
      
      for (const market of data) {
        const detectedSport = detectSport(market.question);
        
        // Skip non-sports markets
        if (detectedSport === 'other') continue;
        
        // Filter by sport if specified
        if (sport !== 'all' && detectedSport !== sport) continue;

        const { yes, no } = parsePrices(market.outcomePrices);
        
        // Skip resolved markets (0% or 100%)
        if (yes <= 0.01 || yes >= 0.99) continue;

        markets.push({
          id: market.id,
          question: market.question,
          yesPrice: yes,
          noPrice: no,
          volume: market.volume || 0,
          sport: detectedSport,
          endDate: market.endDate,
        });
      }
    }

    // Sort by volume (most traded first)
    markets.sort((a, b) => b.volume - a.volume);

    return NextResponse.json({
      success: true,
      count: markets.length,
      markets: markets.slice(0, limit),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching Polymarket data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}
