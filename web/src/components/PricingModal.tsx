"use client";

import styles from './PricingModal.module.css';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  if (!isOpen) return null;

  const handleSubscribe = () => {
    alert("Stripe Integration Placeholder: Redirecting to Checkout...");
    // TODO: Implement Stripe Checkout session creation
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>×</button>
        
        <div className={styles.header}>
          <h2>Upgrade to Pro ⚡</h2>
          <p>Unlock advanced AI insights and unlimited market analysis.</p>
        </div>

        <div className={styles.plans}>
          {/* Free Plan */}
          <div className={styles.planCard}>
            <div className={styles.planHeader}>
              <h3>Free</h3>
              <div className={styles.price}>$0<span>/mo</span></div>
            </div>
            <ul className={styles.features}>
              <li>✅ Basic Market Data</li>
              <li>✅ 5 AI Predictions / Day</li>
              <li>✅ Standard Support</li>
              <li className={styles.disabled}>❌ Advanced Model Analysis</li>
              <li className={styles.disabled}>❌ Sentiment Scans</li>
            </ul>
            <button className={styles.currentBtn} disabled>Current Plan</button>
          </div>

          {/* Pro Plan */}
          <div className={`${styles.planCard} ${styles.proCard}`}>
            <div className={styles.bestValue}>BEST VALUE</div>
            <div className={styles.planHeader}>
              <h3>Pro</h3>
              <div className={styles.price}>$19<span>/mo</span></div>
            </div>
            <ul className={styles.features}>
              <li>✅ Unlimited Market Data</li>
              <li>✅ Unlimited AI Predictions</li>
              <li>✅ Priority Support</li>
              <li>✅ <strong>Advanced Model Breakdown</strong></li>
              <li>✅ <strong>Real-time Sentiment Scans</strong></li>
            </ul>
            <button className={styles.upgradeBtn} onClick={handleSubscribe}>
              Get Pro Access
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
