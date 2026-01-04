"use client";

import React from 'react';
import { getSportCategories, SportCategory } from '@/lib/polymarket-sports';

interface SportFilterBarProps {
  selectedSport: SportCategory;
  onSportChange: (sport: SportCategory) => void;
  marketCounts?: Record<SportCategory, number>;
}

export function SportFilterBar({ 
  selectedSport, 
  onSportChange,
  marketCounts 
}: SportFilterBarProps) {
  const categories = getSportCategories();

  return (
    <div className="sport-filter-bar">
      <div className="sport-filter-scroll">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`sport-filter-tab ${selectedSport === cat.id ? 'active' : ''}`}
            onClick={() => onSportChange(cat.id)}
          >
            <span className="sport-icon">{cat.icon}</span>
            <span className="sport-label">{cat.label}</span>
            {marketCounts && marketCounts[cat.id] > 0 && (
              <span className="sport-count">{marketCounts[cat.id]}</span>
            )}
          </button>
        ))}
      </div>

      <style jsx>{`
        .sport-filter-bar {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.5rem 0;
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(10px);
        }

        .sport-filter-scroll {
          display: flex;
          gap: 0.5rem;
          padding: 0 1rem;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .sport-filter-scroll::-webkit-scrollbar {
          display: none;
        }

        .sport-filter-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .sport-filter-tab:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .sport-filter-tab.active {
          background: linear-gradient(135deg, var(--electric-blue) 0%, var(--neon-lime) 100%);
          border-color: transparent;
          color: #0a0a0a;
        }

        .sport-icon {
          font-size: 1.1rem;
        }

        .sport-label {
          font-size: 0.875rem;
        }

        .sport-count {
          background: rgba(0, 0, 0, 0.3);
          padding: 0.1rem 0.4rem;
          border-radius: 10px;
          font-size: 0.75rem;
        }

        .sport-filter-tab.active .sport-count {
          background: rgba(255, 255, 255, 0.2);
        }

        @media (max-width: 768px) {
          .sport-filter-tab {
            padding: 0.4rem 0.75rem;
          }

          .sport-label {
            display: none;
          }

          .sport-filter-tab.active .sport-label {
            display: inline;
          }
        }
      `}</style>
    </div>
  );
}

export default SportFilterBar;
