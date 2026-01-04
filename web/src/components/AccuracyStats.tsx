"use client";

import { useAccuracy, formatConfidencePercent } from '@/hooks/usePredictions';
import styles from './AccuracyStats.module.css';

export function AccuracyStats() {
  const { training, live, models, loading, error } = useAccuracy();

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading accuracy data...</div>
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
      <h3 className={styles.title}>
        <span className={styles.icon}>📊</span>
        Model Performance
      </h3>

      {/* Training Metrics */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Training Accuracy</h4>
        <div className={styles.metricsGrid}>
          {Object.entries(training).map(([model, metrics]) => (
            <div key={model} className={styles.metricCard}>
              <span className={styles.modelName}>{model}</span>
              <span className={styles.accuracyValue}>
                {formatConfidencePercent(metrics.accuracy)}
              </span>
              <span className={styles.aucLabel}>AUC: {metrics.auc.toFixed(3)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Live Performance */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Live Performance (7 days)</h4>
        <div className={styles.liveStats}>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>{live.total_predictions}</span>
            <span className={styles.statLabel}>Predictions</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>{live.correct_predictions}</span>
            <span className={styles.statLabel}>Correct</span>
          </div>
          <div className={styles.statBox}>
            <span className={`${styles.statNumber} ${styles.highlight}`}>
              {formatConfidencePercent(live.accuracy_7d)}
            </span>
            <span className={styles.statLabel}>Accuracy</span>
          </div>
        </div>
      </div>

      {/* By Sport breakdown */}
      {Object.keys(live.accuracy_by_sport).length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>By Sport</h4>
          <div className={styles.sportBreakdown}>
            {Object.entries(live.accuracy_by_sport).map(([sport, stats]) => (
              <div key={sport} className={styles.sportItem}>
                <span className={styles.sportName}>{sport.toUpperCase()}</span>
                <span className={styles.sportStats}>
                  {stats.correct}/{stats.total} ({stats.total > 0 ? 
                    ((stats.correct / stats.total) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AccuracyStats;
