"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";

// Mock data for demo (will be replaced with API calls)
const mockPredictions = [
  {
    id: 1,
    sport: "nba",
    event: "Lakers vs Celtics",
    prediction: "Lakers",
    confidence: 0.72,
    status: "pending",
    date: "2026-01-03",
  },
  {
    id: 2,
    sport: "nfl",
    event: "Chiefs vs Eagles",
    prediction: "Chiefs",
    confidence: 0.68,
    status: "correct",
    date: "2026-01-02",
  },
  {
    id: 3,
    sport: "mma",
    event: "McGregor vs Diaz III",
    prediction: "McGregor",
    confidence: 0.65,
    status: "pending",
    date: "2026-01-05",
  },
  {
    id: 4,
    sport: "mlb",
    event: "Yankees vs Dodgers",
    prediction: "Yankees",
    confidence: 0.58,
    status: "wrong",
    date: "2026-01-01",
  },
];

const mockStats = {
  totalPredictions: 1812,
  accuracy: 87.5,
  activeBets: 24,
  profitLoss: "+$2,450",
};

const sportEmojis: Record<string, string> = {
  nba: "🏀",
  nfl: "🏈",
  mlb: "⚾",
  nhl: "🏒",
  mma: "🥊",
  soccer: "⚽",
};

export default function Dashboard() {
  const [predictions, setPredictions] = useState(mockPredictions);
  const [stats, setStats] = useState(mockStats);
  const [activeTab, setActiveTab] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  // Simulate loading on mount
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  const filteredPredictions =
    activeTab === "all"
      ? predictions
      : predictions.filter((p) => p.sport === activeTab);

  return (
    <main className={styles.main}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🏆</span>
            <h1>AI Sports Picker</h1>
          </div>
          <nav className={styles.nav}>
            <a href="#predictions" className={styles.navLink}>
              Predictions
            </a>
            <a href="#analytics" className={styles.navLink}>
              Analytics
            </a>
            <button className="btn btn-primary">Connect Wallet</button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroGlow}></div>
        <h2 className={styles.heroTitle}>
          ML-Powered Sports Predictions
          <br />
          <span className={styles.heroHighlight}>Beat the Market</span>
        </h2>
        <p className={styles.heroSubtitle}>
          Using Historical, Sentiment, and Hybrid AI models to predict
          Polymarket sports outcomes with proven accuracy.
        </p>
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>
              {stats.totalPredictions}
            </span>
            <span className={styles.heroStatLabel}>Predictions Made</span>
          </div>
          <div className={styles.heroStatDivider}></div>
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>{stats.accuracy}%</span>
            <span className={styles.heroStatLabel}>Rolling Accuracy</span>
          </div>
          <div className={styles.heroStatDivider}></div>
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>{stats.activeBets}</span>
            <span className={styles.heroStatLabel}>Active Markets</span>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className={styles.statsSection}>
        <div className={`container ${styles.statsGrid}`}>
          <div className="stat-card">
            <span className="stat-label">Historical Model</span>
            <span className="stat-value">86.2%</span>
            <div className={styles.statBar}>
              <div
                className={styles.statBarFill}
                style={{ width: "86.2%" }}
              ></div>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Sentiment Model</span>
            <span className="stat-value">84.8%</span>
            <div className={styles.statBar}>
              <div
                className={styles.statBarFill}
                style={{ width: "84.8%" }}
              ></div>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Hybrid Model</span>
            <span className="stat-value">89.3%</span>
            <div className={styles.statBar}>
              <div
                className={styles.statBarFill}
                style={{ width: "89.3%", background: "var(--gradient-success)" }}
              ></div>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-label">P&L</span>
            <span className="stat-value" style={{ color: "#10b981" }}>
              {stats.profitLoss}
            </span>
            <span className="stat-change positive">↑ 12.4% this week</span>
          </div>
        </div>
      </section>

      {/* Predictions Section */}
      <section id="predictions" className={styles.predictionsSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h3>Live Predictions</h3>
            <div className={styles.tabs}>
              {["all", "nba", "nfl", "mlb", "mma"].map((tab) => (
                <button
                  key={tab}
                  className={`${styles.tab} ${
                    activeTab === tab ? styles.tabActive : ""
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "all" ? "All Sports" : tab.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.predictionsList}>
            {isLoading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <span>Loading predictions...</span>
              </div>
            ) : (
              filteredPredictions.map((pred, index) => (
                <div
                  key={pred.id}
                  className={`glass-card ${styles.predictionCard}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={styles.predictionHeader}>
                    <span className={`sport-icon sport-${pred.sport}`}>
                      {sportEmojis[pred.sport]}
                    </span>
                    <div className={styles.predictionInfo}>
                      <span className={styles.predictionEvent}>
                        {pred.event}
                      </span>
                      <span className={styles.predictionDate}>{pred.date}</span>
                    </div>
                    <span
                      className={`badge ${
                        pred.status === "correct"
                          ? "badge-success"
                          : pred.status === "wrong"
                          ? "badge-danger"
                          : "badge-warning"
                      }`}
                    >
                      {pred.status}
                    </span>
                  </div>
                  <div className={styles.predictionBody}>
                    <div className={styles.predictionPick}>
                      <span className={styles.pickLabel}>AI Pick:</span>
                      <span className={styles.pickValue}>{pred.prediction}</span>
                    </div>
                    <div className={styles.confidenceBar}>
                      <span className={styles.confidenceLabel}>
                        Confidence: {(pred.confidence * 100).toFixed(1)}%
                      </span>
                      <div className="progress-bar">
                        <div
                          className="progress-fill progress-primary"
                          style={{ width: `${pred.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerContent}>
            <div className={styles.footerBrand}>
              <span>🏆</span>
              <span>AI PolyMarket Sports Picker</span>
            </div>
            <p className={styles.footerDisclaimer}>
              For educational purposes only. Sports betting involves risk.
              Always gamble responsibly.
            </p>
            <div className={styles.footerLinks}>
              <a
                href="https://github.com/KevinGastelum/ai-polymarket-sportspicker"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              <span>•</span>
              <a href="https://polymarket.com" target="_blank" rel="noopener">
                Polymarket
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
