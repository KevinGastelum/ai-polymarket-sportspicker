"use client";

import { useState } from "react";
import styles from "./page.module.css";

// Mock Data
const mockStats = {
  totalPredictions: 1812,
  accuracy: 87.5,
  activeBets: 24,
  profitLoss: 2450,
};

const mockPredictions = [
  {
    id: 1,
    sport: "nba",
    event: "Lakers vs Celtics",
    prediction: "Lakers",
    confidence: 0.72,
    status: "pending",
    time: "2h 30m"
  },
  {
    id: 2,
    sport: "nfl",
    event: "Chiefs vs Eagles",
    prediction: "Chiefs",
    confidence: 0.68,
    status: "correct",
    time: "Final"
  },
  {
    id: 3,
    sport: "mma",
    event: "McGregor vs Diaz III",
    prediction: "McGregor",
    confidence: 0.65,
    status: "pending",
    time: "Tomorrow"
  },
  {
    id: 4,
    sport: "mlb",
    event: "Yankees vs Dodgers",
    prediction: "Yankees",
    confidence: 0.58,
    status: "wrong",
    time: "Final"
  },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className={styles.dashboardGrid}>
      
      {/* 1. Hero / Global Map Section (Large Bento Item) */}
      <section className={`${styles.bentoItem} ${styles.globalSection} geo-card`}>
        <div className={styles.mapHeader}>
          <h2>Global Predictions</h2>
          <div className={styles.liveIndicator}>
            <span className={styles.pulseDot}></span>
            Live Activity
          </div>
        </div>
        
        {/* Placeholder for Map Visualization */}
        <div className={styles.mapContainer}>
          <div className={styles.mapGridLines}></div>
          <div className={styles.mapDot} style={{top: '40%', left: '20%'}}></div>
          <div className={styles.mapDot} style={{top: '35%', left: '70%'}}></div>
          <div className={styles.mapDot} style={{top: '60%', left: '80%'}}></div>
          <div className={styles.mapOverlay}>
            <div className={styles.statFloat}>
              <span className={styles.label}>Active Markets</span>
              <span className={styles.value}>12,405</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Stats Column (Stacked Bento Items) */}
      <div className={styles.statsColumn}>
        
        {/* Rolling Accuracy */}
        <div className={`${styles.bentoItem} geo-card`}>
          <div className={styles.cardHeader}>
            <div className="icon-box">🎯</div>
            <span>Accuracy (30d)</span>
          </div>
          <div className={styles.bigStat}>
            87.5%
            <span className="badge badge-lime">+2.4%</span>
          </div>
          <div className={styles.miniChart}>
            <div className={styles.chartBar} style={{height: '40%'}}></div>
            <div className={styles.chartBar} style={{height: '60%'}}></div>
            <div className={styles.chartBar} style={{height: '50%'}}></div>
            <div className={styles.chartBar} style={{height: '80%'}}></div>
            <div className={styles.chartBar} style={{height: '100%'}}></div>
          </div>
        </div>

        {/* P&L */}
        <div className={`${styles.bentoItem} geo-card`}>
          <div className={styles.cardHeader}>
            <div className="icon-box">💰</div>
            <span>Net Profit</span>
          </div>
          <div className={styles.bigStat}>
            $2,450
            <span className="badge badge-lime">▲</span>
          </div>
          <p className={styles.subtext}>vs last month</p>
        </div>

      </div>

      {/* 3. Predictions Feed (Tall Bento Item) */}
      <section className={`${styles.bentoItem} ${styles.feedSection} geo-card`}>
        <div className={styles.feedHeader}>
          <h3>Live Feed</h3>
          <button className="btn-glass" style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem'}}>View All</button>
        </div>

        <div className={styles.predictionList}>
          {mockPredictions.map((pred) => (
            <div key={pred.id} className={styles.predictionRow}>
              <div className={`${styles.sportIcon} sport-${pred.sport}`}>
                {pred.sport === 'nba' ? '🏀' : pred.sport === 'nfl' ? '🏈' : pred.sport === 'mma' ? '🥊' : '⚾'}
              </div>
              
              <div className={styles.predDetails}>
                <span className={styles.predEvent}>{pred.event}</span>
                <span className={styles.predPick}>
                  Pick: <span style={{color: 'var(--neon-lime)'}}>{pred.prediction}</span>
                </span>
              </div>

              <div className={styles.predMeta}>
                <div className={styles.confidenceBadge}>
                  {(pred.confidence * 100).toFixed(0)}%
                </div>
                <span className={styles.predTime}>{pred.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Model Performance (Wide Bottom Item) */}
      <section className={`${styles.bentoItem} ${styles.modelSection} geo-card`}>
        <div className={styles.cardHeader}>
          <h3>Model Performance</h3>
          <div className={styles.modelTags}>
            <span className="badge badge-lime">Hybrid</span>
            <span className="badge badge-cyan">Sentiment</span>
            <span className="badge badge-pink">Historical</span>
          </div>
        </div>
        
        <div className={styles.modelbars}>
          <div className={styles.modelRow}>
            <span>Hybrid Model</span>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{width: '89.3%', background: 'var(--neon-lime)'}}></div>
            </div>
            <span>89.3%</span>
          </div>
          <div className={styles.modelRow}>
            <span>Sentiment</span>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{width: '84.8%', background: 'var(--neon-cyan)'}}></div>
            </div>
            <span>84.8%</span>
          </div>
          <div className={styles.modelRow}>
            <span>Historical</span>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{width: '86.2%', background: 'var(--neon-pink)'}}></div>
            </div>
            <span>86.2%</span>
          </div>
        </div>
      </section>

    </div>
  );
}
