import { NextResponse } from 'next/server';
import { getPredictions, getRecentPredictionStats, type Prediction } from '@/lib/supabase';

// Mock predictions for development when Supabase tables don't exist
const MOCK_PREDICTIONS: Prediction[] = [
  {
    id: 'mock-1',
    market_id: 'pm-nba-1',
    sport: 'nba',
    event_name: 'Lakers vs Celtics',
    predicted_outcome: 'Lakers',
    historical_confidence: 0.72,
    sentiment_confidence: 0.68,
    hybrid_confidence: 0.70,
    actual_outcome: null,
    is_correct: null,
    created_at: new Date().toISOString(),
    resolved_at: null,
  },
  {
    id: 'mock-2',
    market_id: 'pm-nfl-1',
    sport: 'nfl',
    event_name: 'Chiefs vs Bills',
    predicted_outcome: 'Chiefs',
    historical_confidence: 0.65,
    sentiment_confidence: 0.71,
    hybrid_confidence: 0.68,
    actual_outcome: 'Chiefs',
    is_correct: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    resolved_at: new Date().toISOString(),
  },
  {
    id: 'mock-3',
    market_id: 'pm-nba-2',
    sport: 'nba',
    event_name: 'Warriors vs Nuggets',
    predicted_outcome: 'Warriors',
    historical_confidence: 0.55,
    sentiment_confidence: 0.62,
    hybrid_confidence: 0.58,
    actual_outcome: 'Nuggets',
    is_correct: false,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    resolved_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const resolved = searchParams.get('resolved') === 'true';
    const mock = searchParams.get('mock') === 'true';

    // Use mock data if requested or if Supabase fails
    if (mock) {
      const filtered = MOCK_PREDICTIONS.filter(p => {
        if (sport && p.sport !== sport) return false;
        if (resolved && !p.actual_outcome) return false;
        return true;
      }).slice(0, limit);

      return NextResponse.json({
        success: true,
        predictions: filtered,
        stats: {
          total: MOCK_PREDICTIONS.length,
          pending: MOCK_PREDICTIONS.filter(p => !p.actual_outcome).length,
          resolved: MOCK_PREDICTIONS.filter(p => p.actual_outcome).length,
          correct: MOCK_PREDICTIONS.filter(p => p.is_correct).length,
        },
        source: 'mock',
        timestamp: new Date().toISOString(),
      });
    }

    // Fetch from Supabase
    let predictions: Prediction[] = [];
    let stats = { total: 0, correct: 0, accuracy: 0, bySport: {} };
    
    try {
      predictions = await getPredictions({ limit, sport, onlyResolved: resolved });
      stats = await getRecentPredictionStats();
    } catch (dbError) {
      console.warn('Supabase fetch failed, using mock data:', dbError);
      // Fallback to mock data
      predictions = MOCK_PREDICTIONS.filter(p => {
        if (sport && p.sport !== sport) return false;
        if (resolved && !p.actual_outcome) return false;
        return true;
      }).slice(0, limit);
    }

    return NextResponse.json({
      success: true,
      predictions,
      stats: {
        total: predictions.length,
        pending: predictions.filter(p => !p.actual_outcome).length,
        resolved: predictions.filter(p => p.actual_outcome).length,
        correct: predictions.filter(p => p.is_correct).length,
        accuracy7d: stats.accuracy,
        bySport: stats.bySport,
      },
      source: predictions.length > 0 && predictions[0].id.startsWith('mock') ? 'mock' : 'supabase',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching predictions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch predictions' },
      { status: 500 }
    );
  }
}
