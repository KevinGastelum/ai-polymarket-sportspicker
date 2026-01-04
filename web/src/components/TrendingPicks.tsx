"use client";

import { usePredictions, formatConfidencePercent } from '@/hooks/usePredictions';
import { getSportEmoji } from '@/hooks/useMarkets';
import styles from './TrendingPicks.module.css';

export function TrendingPicks() {
  const { predictions, loading } = usePredictions({
    limit: 20,
    useMock: true,
  });

  // Sort by confidence and get top picks
  const topPicks = [...predictions]
    .sort((a, b) => b.hybrid_confidence - a.hybrid_confidence)
    .slice(0, 5);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading top picks...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.fireIcon}>🔥</span>
          Top AI Picks
        </h3>
        <span className={styles.badge}>High Confidence</span>
      </div>

      <div className={styles.picksList}>
        {topPicks.map((prediction, index) => (
          <div 
            key={prediction.id} 
            className={styles.pickItem}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className={styles.rank}>
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
            </div>
            
            <div className={styles.pickInfo}>
              <div className={styles.pickHeader}>
                <span className={styles.sport}>{getSportEmoji(prediction.sport)}</span>
                <span className={styles.eventName}>{prediction.event_name}</span>
              </div>
              <div className={styles.pickDetails}>
                <span className={styles.outcome}>{prediction.predicted_outcome}</span>
                <span className={styles.separator}>•</span>
                <span className={styles.confidence}>
                  {formatConfidencePercent(prediction.hybrid_confidence)}
                </span>
              </div>
            </div>

            <div className={styles.confidenceRing}>
              <svg viewBox="0 0 36 36" className={styles.circularChart}>
                <path
                  className={styles.circleBg}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={styles.circle}
                  strokeDasharray={`${prediction.hybrid_confidence * 100}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {topPicks.length === 0 && (
        <div className={styles.empty}>
          <p>No predictions available</p>
        </div>
      )}
    </div>
  );
}

export default TrendingPicks;
