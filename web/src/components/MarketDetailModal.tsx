"use client";

import { useState, useEffect } from 'react';
import { SportMarket, getSportEmoji, formatConfidence, getPrediction } from '@/hooks/useMarkets';
import { useSubscription } from '@/hooks/useSubscription';
import styles from './MarketDetailModal.module.css';
import { PricingModal } from './PricingModal';

interface MarketDetailModalProps {
  market: SportMarket | null;
  onClose: () => void;
}

export function MarketDetailModal({ market, onClose }: MarketDetailModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const { isPro } = useSubscription();

  useEffect(() => {
    if (market) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [market]);

  if (!market) return null;

  const { pick, confidence } = getPrediction(market);
  const endDate = new Date(market.endDate);
  const isExpiringSoon = endDate.getTime() - Date.now() < 24 * 60 * 60 * 1000;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className={`${styles.backdrop} ${isVisible ? styles.visible : ''}`}
      onClick={handleBackdropClick}
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.sportBadge}>
            <span className={styles.emoji}>{getSportEmoji(market.sport)}</span>
            <span className={styles.sportName}>{market.sport.toUpperCase()}</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Event Title */}
        <h2 className={styles.title}>{market.question}</h2>

        {/* AI Prediction Section */}
        <div className={styles.predictionBox}>
          <div className={styles.predictionLabel}>🤖 AI Prediction</div>
          <div className={styles.predictionValue}>
            <span className={`${styles.pick} ${pick === 'YES' ? styles.pickYes : styles.pickNo}`}>
              {pick}
            </span>
            <span className={styles.confidence}>{formatConfidence(confidence)} confidence</span>
          </div>
        </div>

        {/* Odds Visualization */}
        <div className={styles.oddsSection}>
          <h3>Current Odds</h3>
          <div className={styles.oddsBar}>
            <div 
              className={styles.yesBar}
              style={{ width: `${market.yesPrice * 100}%` }}
            >
              <span>YES {formatConfidence(market.yesPrice)}</span>
            </div>
            <div 
              className={styles.noBar}
              style={{ width: `${market.noPrice * 100}%` }}
            >
              <span>NO {formatConfidence(market.noPrice)}</span>
            </div>
          </div>
        </div>

        {/* Market Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Volume</span>
            <span className={styles.statValue}>
              ${market.volume >= 1000000 
                ? `${(market.volume / 1000000).toFixed(1)}M` 
                : market.volume >= 1000 
                  ? `${(market.volume / 1000).toFixed(0)}K`
                  : market.volume.toFixed(0)}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Ends</span>
            <span className={`${styles.statValue} ${isExpiringSoon ? styles.urgent : ''}`}>
              {endDate.toLocaleDateString()}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Implied Prob</span>
            <span className={styles.statValue}>{formatConfidence(market.yesPrice)}</span>
          </div>
        </div>

        {/* Model Breakdown - GATED */}
        <div className={styles.modelSection}>
          <h3>Model Analysis</h3>
          <div className={`${styles.modelGrid} ${!isPro ? styles.blurred : ''}`}>
            <div className={styles.modelCard}>
              <span className={styles.modelIcon}>📊</span>
              <span className={styles.modelName}>Historical</span>
              <div className={styles.modelBar}>
                <div className={styles.modelFill} style={{ width: `${confidence * 100}%` }} />
              </div>
              <span className={styles.modelScore}>{formatConfidence(confidence)}</span>
            </div>
            <div className={styles.modelCard}>
              <span className={styles.modelIcon}>💬</span>
              <span className={styles.modelName}>Sentiment</span>
              <div className={styles.modelBar}>
                <div className={styles.modelFill} style={{ width: `${(confidence + 0.05) * 100}%` }} />
              </div>
              <span className={styles.modelScore}>{formatConfidence(Math.min(confidence + 0.05, 1))}</span>
            </div>
            <div className={styles.modelCard}>
              <span className={styles.modelIcon}>🧠</span>
              <span className={styles.modelName}>Hybrid</span>
              <div className={`${styles.modelBar} ${styles.hybridBar}`}>
                <div className={styles.modelFillHybrid} style={{ width: `${confidence * 100}%` }} />
              </div>
              <span className={styles.modelScore}>{formatConfidence(confidence)}</span>
            </div>
          </div>

          {!isPro && (
            <div className={styles.lockOverlay}>
              <span className={styles.lockIcon}>🔒</span>
              <h4>Pro Analysis</h4>
              <p>Upgrade to unlock advanced model confidence breakdowns.</p>
              <button 
                className={styles.upgradeBtn} 
                onClick={() => setShowPricing(true)}
              >
                Get Pro Access
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <a 
            href={`https://polymarket.com/event/${market.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.primaryBtn}
          >
            View on Polymarket →
          </a>
          <button className={styles.secondaryBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <PricingModal 
        isOpen={showPricing} 
        onClose={() => setShowPricing(false)} 
      />
    </div>
  );
}

export default MarketDetailModal;
