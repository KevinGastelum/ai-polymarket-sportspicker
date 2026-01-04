import { NextResponse } from 'next/server';
import { getAccuracyMetrics, getRecentPredictionStats, type ModelMetrics } from '@/lib/supabase';

// Model metrics from training (fallback if Supabase unavailable)
const TRAINING_METRICS = {
  historical: { accuracy: 0.9256, auc: 0.882 },
  sentiment: { accuracy: 0.9256, auc: 0.883 },
  hybrid: { accuracy: 0.9256, auc: 0.882 },
};

export async function GET() {
  try {
    let metrics: ModelMetrics[] = [];
    let liveStats = { total: 0, correct: 0, accuracy: 0, bySport: {} };
    let source = 'supabase';

    try {
      metrics = await getAccuracyMetrics();
      liveStats = await getRecentPredictionStats();
    } catch (dbError) {
      console.warn('Supabase unavailable, using training metrics:', dbError);
      source = 'training';
    }

    // Build response with both training and live metrics
    const response = {
      success: true,
      
      // Training performance (from Colab)
      training: TRAINING_METRICS,
      
      // Live performance (from predictions)
      live: {
        total_predictions: liveStats.total,
        correct_predictions: liveStats.correct,
        accuracy_7d: liveStats.accuracy,
        accuracy_by_sport: liveStats.bySport,
      },
      
      // Per-model metrics from Supabase
      models: metrics.length > 0 ? metrics : [
        {
          id: 'fallback-1',
          model_type: 'historical',
          accuracy_7d: TRAINING_METRICS.historical.accuracy,
          accuracy_30d: TRAINING_METRICS.historical.accuracy,
          total_predictions: 0,
          correct_predictions: 0,
          updated_at: new Date().toISOString(),
        },
        {
          id: 'fallback-2',
          model_type: 'sentiment',
          accuracy_7d: TRAINING_METRICS.sentiment.accuracy,
          accuracy_30d: TRAINING_METRICS.sentiment.accuracy,
          total_predictions: 0,
          correct_predictions: 0,
          updated_at: new Date().toISOString(),
        },
        {
          id: 'fallback-3',
          model_type: 'hybrid',
          accuracy_7d: TRAINING_METRICS.hybrid.accuracy,
          accuracy_30d: TRAINING_METRICS.hybrid.accuracy,
          total_predictions: 0,
          correct_predictions: 0,
          updated_at: new Date().toISOString(),
        },
      ],
      
      source,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching accuracy metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch accuracy metrics' },
      { status: 500 }
    );
  }
}
