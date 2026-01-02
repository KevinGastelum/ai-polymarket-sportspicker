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
        
        {/* World Map Visualization */}
        <div className={styles.mapContainer}>
          {/* SVG World Map Outline */}
          <svg className={styles.worldMap} viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
            {/* Simplified world continents */}
            <path 
              className={styles.continent}
              d="M150,200 Q200,180 250,200 L280,220 Q300,250 280,280 L200,300 Q150,280 150,200Z
                 M350,180 L450,160 Q500,180 520,220 L540,280 Q520,320 480,340 L400,360 Q350,340 340,280 L350,180Z
                 M580,140 Q650,120 720,140 L800,180 Q850,220 840,280 L800,340 Q750,380 680,360 L600,320 Q560,280 560,220 L580,140Z
                 M900,200 Q950,180 1000,200 L1050,240 Q1080,280 1060,320 L1000,360 Q950,380 900,360 L860,320 Q840,280 860,240 L900,200Z
                 M200,380 Q250,360 300,380 L340,420 Q360,460 340,500 L280,520 Q230,500 220,460 L200,380Z
                 M700,400 Q750,380 800,400 L840,440 Q860,480 840,520 L780,540 Q730,520 720,480 L700,400Z"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />
            {/* Grid lines */}
            <g stroke="rgba(255,255,255,0.03)" strokeWidth="0.5">
              {[...Array(12)].map((_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 50} x2="1200" y2={i * 50} />
              ))}
              {[...Array(24)].map((_, i) => (
                <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="600" />
              ))}
            </g>
          </svg>
          
          {/* Glowing activity dots */}
          <div className={styles.mapDot} style={{top: '35%', left: '15%'}}><span>NBA</span></div>
          <div className={styles.mapDot} style={{top: '40%', left: '45%'}}><span>Soccer</span></div>
          <div className={styles.mapDot} style={{top: '30%', left: '75%'}}><span>NFL</span></div>
          <div className={styles.mapDot} style={{top: '55%', left: '85%'}}><span>MMA</span></div>
          
          {/* Stats overlay */}
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
