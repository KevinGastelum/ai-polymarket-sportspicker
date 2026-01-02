"use client";

import { useState } from "react";
import styles from "./page.module.css";
import { useMarkets, getSportEmoji, formatConfidence, getPrediction, SportMarket } from "@/hooks/useMarkets";

// Sport filter options
const SPORT_FILTERS = [
  { key: 'all', label: 'All Sports' },
  { key: 'nfl', label: '🏈 NFL' },
  { key: 'nba', label: '🏀 NBA' },
  { key: 'nhl', label: '🏒 NHL' },
  { key: 'mma', label: '🥊 MMA' },
  { key: 'soccer', label: '⚽ Soccer' },
];

export default function Dashboard() {
  const [sportFilter, setSportFilter] = useState("all");
  
  // Fetch live markets
  const { markets, loading, error, lastUpdated, refresh } = useMarkets({
    sport: sportFilter,
    limit: 50,
    autoRefresh: true,
    refreshInterval: 60000, // Every minute
  });

  // Count markets by sport
  const sportCounts = markets.reduce((acc, m) => {
    acc[m.sport] = (acc[m.sport] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get top markets (highest volume)
  const topMarkets = [...markets].sort((a, b) => b.volume - a.volume).slice(0, 8);

  return (
    <div className={styles.dashboardGrid}>
      
      {/* 1. Hero / Global Map Section */}
      <section className={`${styles.bentoItem} ${styles.globalSection} geo-card`}>
        <div className={styles.mapHeader}>
          <h2>Global Predictions</h2>
          <div className={styles.liveIndicator}>
            <span className={styles.pulseDot}></span>
            {loading ? 'Updating...' : 'Live'}
          </div>
        </div>
        
        {/* World Map Visualization */}
        <div className={styles.mapContainer}>
          <svg className={styles.worldMap} viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
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
            <g stroke="rgba(255,255,255,0.03)" strokeWidth="0.5">
              {[...Array(12)].map((_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 50} x2="1200" y2={i * 50} />
              ))}
              {[...Array(24)].map((_, i) => (
                <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="600" />
              ))}
            </g>
          </svg>
          
          {/* Dynamic dots based on sport activity */}
          {sportCounts.nba && <div className={styles.mapDot} style={{top: '35%', left: '18%'}}><span>NBA ({sportCounts.nba})</span></div>}
          {sportCounts.nfl && <div className={styles.mapDot} style={{top: '30%', left: '22%'}}><span>NFL ({sportCounts.nfl})</span></div>}
          {sportCounts.soccer && <div className={styles.mapDot} style={{top: '40%', left: '48%'}}><span>Soccer ({sportCounts.soccer})</span></div>}
          {sportCounts.nhl && <div className={styles.mapDot} style={{top: '28%', left: '15%'}}><span>NHL ({sportCounts.nhl})</span></div>}
          {sportCounts.mma && <div className={styles.mapDot} style={{top: '55%', left: '85%'}}><span>MMA ({sportCounts.mma})</span></div>}
          
          <div className={styles.mapOverlay}>
            <div className={styles.statFloat}>
              <span className={styles.label}>Active Markets</span>
              <span className={styles.value}>{markets.length.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Stats Column */}
      <div className={styles.statsColumn}>
        
        {/* Sport Filter */}
        <div className={`${styles.bentoItem} geo-card`}>
          <div className={styles.cardHeader}>
            <div className="icon-box">🔍</div>
            <span>Filter</span>
          </div>
          <div className={styles.filterGrid}>
            {SPORT_FILTERS.map((filter) => (
              <button
                key={filter.key}
                className={`${styles.filterBtn} ${sportFilter === filter.key ? styles.filterActive : ''}`}
                onClick={() => setSportFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Last Updated */}
        <div className={`${styles.bentoItem} geo-card`}>
          <div className={styles.cardHeader}>
            <div className="icon-box">⏱️</div>
            <span>Last Update</span>
          </div>
          <div className={styles.bigStat}>
            {lastUpdated ? lastUpdated.toLocaleTimeString() : '--:--'}
          </div>
          <button className="btn-glass" onClick={refresh} style={{ marginTop: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            Refresh Now
          </button>
        </div>

      </div>

      {/* 3. Live Markets Feed */}
      <section className={`${styles.bentoItem} ${styles.feedSection} geo-card`}>
        <div className={styles.feedHeader}>
          <h3>Live Markets</h3>
          <span className={styles.marketCount}>{markets.length} markets</span>
        </div>

        {loading && markets.length === 0 ? (
          <div className={styles.loadingState}>Loading markets...</div>
        ) : error ? (
          <div className={styles.errorState}>{error}</div>
        ) : (
          <div className={styles.predictionList}>
            {markets.slice(0, 12).map((market) => {
              const { pick, confidence } = getPrediction(market);
              return (
                <div key={market.id} className={styles.predictionRow}>
                  <div className={`${styles.sportIcon}`}>
                    {getSportEmoji(market.sport)}
                  </div>
                  
                  <div className={styles.predDetails}>
                    <span className={styles.predEvent}>{market.question}</span>
                    <span className={styles.predPick}>
                      Forecast: <span style={{color: 'var(--neon-lime)'}}>{pick}</span>
                    </span>
                  </div>

                  <div className={styles.predMeta}>
                    <div className={styles.confidenceBadge}>
                      {formatConfidence(confidence)}
                    </div>
                    <span className={styles.predTime}>{market.sport.toUpperCase()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Top Volume Markets */}
      <section className={`${styles.bentoItem} ${styles.modelSection} geo-card`}>
        <div className={styles.cardHeader}>
          <h3>Highest Volume Markets</h3>
          <div className={styles.modelTags}>
            <span className="badge badge-lime">Trending</span>
          </div>
        </div>
        
        <div className={styles.modelbars}>
          {topMarkets.slice(0, 5).map((market) => {
            const { pick, confidence } = getPrediction(market);
            return (
              <div key={market.id} className={styles.modelRow}>
                <span>{getSportEmoji(market.sport)} {market.question.slice(0, 40)}...</span>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill} 
                    style={{
                      width: `${confidence * 100}%`, 
                      background: pick === 'YES' ? 'var(--neon-lime)' : 'var(--neon-pink)'
                    }}
                  ></div>
                </div>
                <span>{formatConfidence(confidence)}</span>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
