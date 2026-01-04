"use client";

import React, { useState } from 'react';
import { useSportsMarkets, SportCategory } from '@/hooks/useSportsMarkets';
import { SportFilterBar } from '@/components/SportFilterBar';
import { SportsMarketCard } from '@/components/SportsMarketCard';
import { SportsMarket } from '@/lib/polymarket-sports';

interface SportsMarketsPageProps {
  onMarketClick?: (market: SportsMarket) => void;
}

export function SportsMarketsPage({ onMarketClick }: SportsMarketsPageProps) {
  const [selectedSport, setSelectedSport] = useState<SportCategory>('all');
  
  const { 
    markets, 
    liveMarkets,
    loading, 
    error, 
    lastUpdated,
    refresh,
    marketsBySport
  } = useSportsMarkets({ 
    sport: selectedSport,
    limit: 100 
  });

  // Calculate market counts for filter bar
  const marketCounts = Object.entries(marketsBySport).reduce((acc, [sport, markets]) => {
    acc[sport as SportCategory] = markets.length;
    return acc;
  }, { all: markets.length } as Record<SportCategory, number>);

  return (
    <div className="sports-markets-page">
      {/* Sport Filter */}
      <SportFilterBar
        selectedSport={selectedSport}
        onSportChange={setSelectedSport}
        marketCounts={marketCounts}
      />

      {/* Live Games Section */}
      {liveMarkets.length > 0 && (
        <section className="live-section">
          <h2 className="section-title">
            <span className="live-icon">🔴</span> Live Now
          </h2>
          <div className="live-scroll">
            {liveMarkets.map(market => (
              <SportsMarketCard
                key={market.id}
                market={market}
                onClick={onMarketClick}
              />
            ))}
          </div>
        </section>
      )}

      {/* All Markets */}
      <section className="markets-section">
        <div className="section-header">
          <h2 className="section-title">
            {selectedSport === 'all' ? 'All Sports' : selectedSport.toUpperCase()} Markets
          </h2>
          <div className="section-meta">
            {!loading && (
              <span className="market-count">{markets.length} markets</span>
            )}
            {lastUpdated && (
              <span className="last-updated">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button className="refresh-btn" onClick={refresh} disabled={loading}>
              {loading ? '⏳' : '🔄'}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <span>⚠️ {error}</span>
            <button onClick={refresh}>Retry</button>
          </div>
        )}

        {loading && markets.length === 0 ? (
          <div className="loading-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="loading-card" />
            ))}
          </div>
        ) : (
          <div className="markets-grid">
            {markets
              .filter(m => m.status !== 'live') // Live shown above
              .map(market => (
                <SportsMarketCard
                  key={market.id}
                  market={market}
                  onClick={onMarketClick}
                />
              ))}
          </div>
        )}

        {!loading && markets.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">🏆</span>
            <h3>No markets found</h3>
            <p>Check back later for more {selectedSport !== 'all' ? selectedSport.toUpperCase() : ''} markets</p>
          </div>
        )}
      </section>

      <style jsx>{`
        .sports-markets-page {
          min-height: 100vh;
          padding-bottom: 2rem;
        }

        .live-section {
          padding: 1.5rem 1rem;
          background: linear-gradient(180deg, rgba(163, 230, 53, 0.05), transparent);
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
          margin: 0 0 1rem 0;
        }

        .live-icon {
          animation: pulse-red 1.5s infinite;
        }

        @keyframes pulse-red {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .live-scroll {
          display: flex;
          gap: 1rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .live-scroll::-webkit-scrollbar {
          display: none;
        }

        .live-scroll > :global(div) {
          min-width: 320px;
          flex-shrink: 0;
        }

        .markets-section {
          padding: 1.5rem 1rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .section-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .refresh-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          padding: 0.4rem 0.6rem;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.2s;
        }

        .refresh-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .markets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }

        .loading-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }

        .loading-card {
          height: 200px;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.03) 25%,
            rgba(255, 255, 255, 0.06) 50%,
            rgba(255, 255, 255, 0.03) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 16px;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #f87171;
          margin-bottom: 1rem;
        }

        .error-message button {
          background: rgba(239, 68, 68, 0.2);
          border: none;
          border-radius: 8px;
          padding: 0.4rem 0.8rem;
          color: white;
          cursor: pointer;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .empty-icon {
          font-size: 3rem;
          display: block;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          color: white;
          margin: 0 0 0.5rem 0;
        }

        .empty-state p {
          margin: 0;
        }

        @media (max-width: 768px) {
          .markets-grid {
            grid-template-columns: 1fr;
          }

          .section-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

export default SportsMarketsPage;
