import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAccuracy, formatConfidencePercent } from '../hooks/usePredictions';

export function AccuracyStats() {
  const { training, live, loading, error } = useAccuracy();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading accuracy...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>📊</Text>
        <Text style={styles.title}>Model Performance</Text>
      </View>

      {/* Training Metrics */}
      <Text style={styles.sectionTitle}>Training Accuracy</Text>
      <View style={styles.metricsGrid}>
        {Object.entries(training).map(([model, metrics]) => (
          <View key={model} style={styles.metricCard}>
            <Text style={styles.modelName}>{model}</Text>
            <Text style={styles.accuracyValue}>
              {formatConfidencePercent(metrics.accuracy)}
            </Text>
            <Text style={styles.aucLabel}>AUC: {metrics.auc.toFixed(3)}</Text>
          </View>
        ))}
      </View>

      {/* Live Performance */}
      <Text style={styles.sectionTitle}>Live (7 Days)</Text>
      <View style={styles.liveStats}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{live.total_predictions}</Text>
          <Text style={styles.statLabel}>Predictions</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{live.correct_predictions}</Text>
          <Text style={styles.statLabel}>Correct</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, styles.highlight]}>
            {formatConfidencePercent(live.accuracy_7d)}
          </Text>
          <Text style={styles.statLabel}>Accuracy</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(30, 30, 50, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    padding: 10,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  modelName: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  accuracyValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#c8ff00',
  },
  aucLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  liveStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  highlight: {
    color: '#c8ff00',
  },
  statLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    color: '#f87171',
    textAlign: 'center',
  },
});

export default AccuracyStats;
