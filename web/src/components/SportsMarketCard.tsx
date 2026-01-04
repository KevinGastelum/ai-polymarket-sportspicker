"use client";

import React from 'react';
import { SportsMarket, getSportIcon, formatVolume, formatProbability } from '@/lib/polymarket-sports';

interface SportsMarketCardProps {
  market: SportsMarket;
  onClick?: (market: SportsMarket) => void;
}

export function SportsMarketCard({ market, onClick }: SportsMarketCardProps) {
  const sportIcon = getSportIcon(market.sport);
  const isLive = market.status === 'live';
  const isSpread = market.type === 'spread';

  // Get primary outcome (usually favorite)
  const primaryOutcome = market.outcomes[0];
  const secondaryOutcome = market.outcomes[1];

  return (
    <div 
      className={`sports-market-card ${isLive ? 'live' : ''}`}
      onClick={() => onClick?.(market)}
    >
      {/* Header */}
      <div className="card-header">
        <div className="sport-badge">
          <span className="sport-emoji">{sportIcon}</span>
          <span className="sport-name">{market.sport.toUpperCase()}</span>
        </div>
        {isLive && (
          <div className="live-badge">
            <span className="live-dot"></span>
            LIVE
          </div>
        )}
        {market.type !== 'moneyline' && (
          <div className="market-type-badge">{market.type.toUpperCase()}</div>
        )}
      </div>

      {/* Title */}
      <h3 className="card-title">{market.title}</h3>

      {/* Spread indicator */}
      {isSpread && market.spreadValue && (
        <div className="spread-indicator">
          Spread: {market.spreadValue} pts
        </div>
      )}

      {/* Outcomes */}
      <div className="outcomes">
        {market.outcomes.slice(0, 2).map((outcome, i) => (
          <div key={i} className={`outcome ${i === 0 ? 'primary' : 'secondary'}`}>
            <div className="outcome-name">{outcome.name}</div>
            <div className="outcome-price">
              <span className="price-value">{formatProbability(outcome.price)}</span>
            </div>
            <div 
              className="outcome-bar" 
              style={{ width: `${outcome.price * 100}%` }}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="card-footer">
        <span className="volume">Vol: {formatVolume(market.volume)}</span>
        <span className="end-date">
          {isLive ? 'In Progress' : new Date(market.endDate).toLocaleDateString()}
        </span>
      </div>

      <style jsx>{`
        .sports-market-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 1.25rem;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .sports-market-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .sports-market-card.live {
          border-color: var(--neon-lime, #a3e635);
          box-shadow: 0 0 20px rgba(163, 230, 53, 0.1);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .sport-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .sport-emoji {
          font-size: 1rem;
        }

        .sport-name {
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .live-badge {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: linear-gradient(135deg, var(--neon-lime, #a3e635), #84cc16);
          color: #0a0a0a;
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .live-dot {
          width: 6px;
          height: 6px;
          background: #0a0a0a;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .market-type-badge {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          padding: 0.2rem 0.5rem;
          border-radius: 8px;
          font-size: 0.65rem;
          font-weight: 600;
        }

        .card-title {
          font-size: 1rem;
          font-weight: 600;
          color: white;
          margin: 0 0 0.75rem 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .spread-indicator {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
          padding: 0.3rem 0.6rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 500;
          display: inline-block;
          margin-bottom: 0.75rem;
        }

        .outcomes {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .outcome {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.6rem 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 10px;
          overflow: hidden;
        }

        .outcome-bar {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          background: linear-gradient(90deg, rgba(59, 130, 246, 0.2), transparent);
          z-index: 0;
        }

        .outcome.primary .outcome-bar {
          background: linear-gradient(90deg, rgba(163, 230, 53, 0.2), transparent);
        }

        .outcome-name {
          position: relative;
          z-index: 1;
          font-size: 0.875rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
        }

        .outcome-price {
          position: relative;
          z-index: 1;
        }

        .price-value {
          font-size: 0.875rem;
          font-weight: 700;
          color: white;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .volume {
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

export default SportsMarketCard;
