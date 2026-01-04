import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Prediction, formatConfidencePercent, getConfidenceLevel, getSportEmoji } from '../hooks/usePredictions';

interface PredictionCardProps {
  prediction: Prediction;
  onPress?: () => void;
}

export function PredictionCard({ prediction, onPress }: PredictionCardProps) {
  const { label: confidenceLabel, color: confidenceColor } = getConfidenceLevel(prediction.hybrid_confidence);
  const isResolved = prediction.actual_outcome !== null;

  return (
    <TouchableOpacity 
      style={[styles.card, isResolved && styles.resolved]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Sport Badge */}
      <View style={styles.sportBadge}>
        <Text style={styles.sportEmoji}>{getSportEmoji(prediction.sport)}</Text>
        <Text style={styles.sportName}>{prediction.sport.toUpperCase()}</Text>
      </View>

      {/* Event Name */}
      <Text style={styles.eventName} numberOfLines={2}>
        {prediction.event_name}
      </Text>

      {/* Prediction */}
      <View style={styles.predictionRow}>
        <Text style={styles.predictionLabel}>AI Pick:</Text>
        <Text style={[styles.predictionValue, { color: confidenceColor }]}>
          {prediction.predicted_outcome}
        </Text>
      </View>

      {/* Confidence Breakdown */}
      <View style={styles.confidenceGrid}>
        <ConfidenceBar 
          label="📊 Historical" 
          value={prediction.historical_confidence} 
        />
        <ConfidenceBar 
          label="💬 Sentiment" 
          value={prediction.sentiment_confidence} 
        />
        <ConfidenceBar 
          label="🧠 Hybrid" 
          value={prediction.hybrid_confidence}
          isHybrid 
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={[styles.confidenceBadge, { borderColor: confidenceColor }]}>
          <Text style={[styles.confidenceBadgeText, { color: confidenceColor }]}>
            {confidenceLabel}
          </Text>
        </View>
        
        {isResolved && (
          <View style={[
            styles.resultBadge, 
            prediction.is_correct ? styles.correct : styles.incorrect
          ]}>
            <Text style={styles.resultText}>
              {prediction.is_correct ? '✓ Correct' : '✗ Wrong'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

interface ConfidenceBarProps {
  label: string;
  value: number;
  isHybrid?: boolean;
}

function ConfidenceBar({ label, value, isHybrid }: ConfidenceBarProps) {
  return (
    <View style={styles.confidenceItem}>
      <Text style={styles.modelLabel}>{label}</Text>
      <View style={styles.barContainer}>
        <View 
          style={[
            styles.barFill, 
            isHybrid && styles.hybridBar,
            { width: `${value * 100}%` }
          ]} 
        />
      </View>
      <Text style={styles.confidenceValue}>
        {formatConfidencePercent(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginBottom: 12,
  },
  resolved: {
    opacity: 0.8,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  sportEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  sportName: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    lineHeight: 22,
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  predictionLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginRight: 8,
  },
  predictionValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  confidenceGrid: {
    marginBottom: 12,
  },
  confidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modelLabel: {
    width: 100,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  barContainer: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#60a5fa',
    borderRadius: 3,
  },
  hybridBar: {
    backgroundColor: '#c8ff00',
  },
  confidenceValue: {
    width: 50,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 20,
  },
  confidenceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  correct: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
  },
  incorrect: {
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
  },
  resultText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});

export default PredictionCard;
