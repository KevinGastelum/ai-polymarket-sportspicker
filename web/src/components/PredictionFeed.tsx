"use client";

import { usePredictions, formatConfidencePercent, getConfidenceLevel } from '@/hooks/usePredictions';
import { getSportEmoji } from '@/hooks/useMarkets';
import styles from './PredictionFeed.module.css';

interface PredictionFeedProps {
  limit?: number;
  sport?: string;
  showResolved?: boolean;
}

export function PredictionFeed({ limit = 10, sport, showResolved = false }: PredictionFeedProps) {
  const { predictions, stats, loading, error, source } = usePredictions({
    limit,
    sport,
    onlyResolved: showResolved,
    useMock: true, // Use mock data until Supabase tables are populated
  });

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <span>Loading predictions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.aiIcon}>🤖</span>
          AI Predictions
        </h3>
        <div className={styles.headerStats}>
          <span className={styles.statBadge}>
            {stats.correct}/{stats.resolved} correct
          </span>
          <span className={`${styles.sourceBadge} ${source === 'supabase' ? styles.live : ''}`}>
            {source === 'supabase' ? '🟢 Live' : '🔵 Demo'}
          </span>
        </div>
      </div>

      <div className={styles.feed}>
        {predictions.map((prediction, index) => {
          const { label: confidenceLabel, color: confidenceColor } = getConfidenceLevel(prediction.hybrid_confidence);
          const isResolved = prediction.actual_outcome !== null;
          
          return (
            <div 
              key={prediction.id} 
              className={`${styles.predictionCard} ${isResolved ? styles.resolved : ''}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Sport Badge */}
              <div className={styles.sportBadge}>
                <span className={styles.sportEmoji}>{getSportEmoji(prediction.sport)}</span>
                <span className={styles.sportName}>{prediction.sport.toUpperCase()}</span>
              </div>

              {/* Event Name */}
              <h4 className={styles.eventName}>{prediction.event_name}</h4>

              {/* Prediction */}
              <div className={styles.predictionRow}>
                <span className={styles.predictionLabel}>AI Pick:</span>
                <span className={styles.predictionValue} style={{ color: confidenceColor }}>
                  {prediction.predicted_outcome}
                </span>
              </div>

              {/* Confidence Breakdown */}
              <div className={styles.confidenceGrid}>
                <div className={styles.confidenceItem}>
                  <span className={styles.modelLabel}>📊 Historical</span>
                  <div className={styles.miniBar}>
                    <div 
                      className={styles.miniBarFill} 
                      style={{ width: `${prediction.historical_confidence * 100}%` }}
                    />
                  </div>
                  <span className={styles.confidenceValue}>
                    {formatConfidencePercent(prediction.historical_confidence)}
                  </span>
                </div>
                
                <div className={styles.confidenceItem}>
                  <span className={styles.modelLabel}>💬 Sentiment</span>
                  <div className={styles.miniBar}>
                    <div 
                      className={styles.miniBarFill} 
                      style={{ width: `${prediction.sentiment_confidence * 100}%` }}
                    />
                  </div>
                  <span className={styles.confidenceValue}>
                    {formatConfidencePercent(prediction.sentiment_confidence)}
                  </span>
                </div>
                
                <div className={styles.confidenceItem}>
                  <span className={styles.modelLabel}>🧠 Hybrid</span>
                  <div className={styles.miniBar}>
                    <div 
                      className={`${styles.miniBarFill} ${styles.hybridBar}`}
                      style={{ width: `${prediction.hybrid_confidence * 100}%` }}
                    />
                  </div>
                  <span className={styles.confidenceValue} style={{ color: confidenceColor }}>
                    {formatConfidencePercent(prediction.hybrid_confidence)}
                  </span>
                </div>
              </div>

              {/* Confidence Level Badge */}
              <div className={styles.cardFooter}>
                <span 
                  className={styles.confidenceBadge}
                  style={{ borderColor: confidenceColor, color: confidenceColor }}
                >
                  {confidenceLabel} Confidence
                </span>
                
                {isResolved && (
                  <span className={`${styles.resultBadge} ${prediction.is_correct ? styles.correct : styles.incorrect}`}>
                    {prediction.is_correct ? '✓ Correct' : '✗ Wrong'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {predictions.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🎯</span>
          <p>No predictions yet</p>
          <span className={styles.emptyHint}>Run the predictor to generate picks</span>
        </div>
      )}
    </div>
  );
}

export default PredictionFeed;
