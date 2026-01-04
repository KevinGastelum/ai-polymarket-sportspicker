"use client";

import React, { useState } from 'react';
import { usePredictions, Prediction, formatConfidencePercent, getConfidenceLevel } from '@/hooks/usePredictions';
import { SportFilterBar } from '@/components/SportFilterBar';
import { SportCategory } from '@/lib/polymarket-sports';

type StatusFilter = 'all' | 'pending' | 'correct' | 'incorrect';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function PredictionsHistoryPage() {
  const [selectedSport, setSelectedSport] = useState<SportCategory>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [activeTab, setActiveTab] = useState<'history' | 'portfolio'>('portfolio'); // Default to portfolio for visibility
  
  const { 
    predictions, 
    stats,
    loading, 
    error, 
    refresh 
  } = usePredictions({ 
    sport: selectedSport === 'all' ? undefined : selectedSport,
    limit: 1000, // Fetch more for portfolio
    onlyResolved: activeTab === 'portfolio' ? true : (statusFilter === 'correct' || statusFilter === 'incorrect'),
  });

  // Calculate Portfolio Data
  const INITIAL_BALANCE = 1000;
  const BET_AMOUNT = 50;
  
  const portfolioData = React.useMemo(() => {
    let balance = INITIAL_BALANCE;
    // Sort predictions by date ascending
    const sorted = [...predictions]
      .filter(p => p.is_correct !== null) // Only resolved
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
    const data = sorted.map(p => {
      // Logic: PnL = (Bet / Price) - Bet. 
      // Heuristic: Price = Confidence - 0.05 (Edge)
      const price = Math.max(0.01, Math.min(0.99, (p.hybrid_confidence || 0.5) - 0.05));
      const pnl = p.is_correct 
        ? (BET_AMOUNT / price) - BET_AMOUNT 
        : -BET_AMOUNT;
        
      balance += pnl;
      
      return {
        date: new Date(p.created_at).toLocaleDateString(),
        balance: balance,
        event: p.event_name,
        result: p.is_correct ? 'WIN' : 'LOSS',
        pnl: pnl
      };
    });

    // Add initial point
    return [{ date: 'Start', balance: INITIAL_BALANCE, event: 'Initial Deposit', result: '-', pnl: 0 }, ...data];
  }, [predictions]);

  const currentBalance = portfolioData[portfolioData.length - 1]?.balance || INITIAL_BALANCE;
  const totalPnL = currentBalance - INITIAL_BALANCE;
  const roi = (totalPnL / INITIAL_BALANCE) * 100;

  // Apply status filter for HISTORY tab
  const filteredPredictions = predictions.filter(p => {
    if (activeTab === 'portfolio') return true; // Show all used in calculation? Or just don't use this list
    if (statusFilter === 'pending') return p.is_correct === null;
    if (statusFilter === 'correct') return p.is_correct === true;
    if (statusFilter === 'incorrect') return p.is_correct === false;
    return true;
  });

  return (
    <div className="predictions-history-page">
      {/* Header */}
      <div className="page-header">
        <h1>📊 Predictions History</h1>
        <p>Track your past predictions and results</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 Match History
        </button>
        <button 
          className={`tab-btn ${activeTab === 'portfolio' ? 'active' : ''}`}
          onClick={() => setActiveTab('portfolio')}
        >
          📈 Portfolio Simulator
        </button>
      </div>

      {activeTab === 'portfolio' ? (
        <div className="portfolio-view">
          {/* Portfolio Stats */}
          <div className="portfolio-stats">
            <div className="p-stat">
              <span className="label">Current Balance</span>
              <span className={`value ${totalPnL >= 0 ? 'green' : 'red'}`}>
                ${currentBalance.toFixed(2)}
              </span>
            </div>
            <div className="p-stat">
              <span className="label">Total PnL</span>
              <span className={`value ${totalPnL >= 0 ? 'green' : 'red'}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </span>
            </div>
            <div className="p-stat">
              <span className="label">ROI</span>
              <span className={`value ${roi >= 0 ? 'green' : 'red'}`}>
                {roi.toFixed(1)}%
              </span>
            </div>
            <div className="p-stat">
              <span className="label">Total Bets</span>
              <span className="value">{portfolioData.length - 1}</span>
            </div>
          </div>

          {/* Chart */}
          <div className="chart-container">
            <h3>Performance Over Time (Fixed $50 Bet)</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={portfolioData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#666" 
                    tick={{fill: '#888', fontSize: 10}}
                    minTickGap={30}
                  />
                  <YAxis 
                    stroke="#666" 
                    tick={{fill: '#888', fontSize: 12}}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                    labelStyle={{ color: '#888' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="#4ade80" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Banner */}
          <div className="stats-banner">
             <div className="stat">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat">
              <span className="stat-value pending">{stats.pending}</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat">
              <span className="stat-value correct">{stats.correct}</span>
              <span className="stat-label">Correct</span>
            </div>
            <div className="stat">
              <span className="stat-value resolved">{stats.resolved}</span>
              <span className="stat-label">Resolved</span>
            </div>
            {stats.resolved > 0 && (
              <div className="stat accuracy">
                <span className="stat-value">
                  {((stats.correct / stats.resolved) * 100).toFixed(1)}%
                </span>
                <span className="stat-label">Accuracy</span>
              </div>
            )}
          </div>

          {/* Sport Filter */}
          <SportFilterBar
            selectedSport={selectedSport}
            onSportChange={setSelectedSport}
          />

          {/* Status Filter */}
          <div className="status-filter">
            {(['all', 'pending', 'correct', 'incorrect'] as StatusFilter[]).map(status => (
              <button
                key={status}
                className={`status-btn ${statusFilter === status ? 'active' : ''} ${status}`}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' && '📋 All'}
                {status === 'pending' && '⏳ Pending'}
                {status === 'correct' && '✅ Correct'}
                {status === 'incorrect' && '❌ Wrong'}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Error state */}
      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={refresh}>Retry</button>
        </div>
      )}

      {/* Loading state */}
      {loading && predictions.length === 0 ? (
        <div className="loading">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="loading-card" />
          ))}
        </div>
      ) : (
        /* Predictions list (Only show if History tab or if just want specific list below) 
           Let's show recent bets list below chart in Portfolio mode too? No, keep separate.
        */
        activeTab === 'history' && (
          <div className="predictions-list">
            {filteredPredictions.map(prediction => (
              <PredictionHistoryCard key={prediction.id} prediction={prediction} />
            ))}
          </div>
        )
      )}

      {/* Empty state */}
      {!loading && filteredPredictions.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">🔮</span>
          <h3>No predictions found</h3>
          <p>Try changing your filters</p>
        </div>
      )}

      <style jsx>{`
        .predictions-history-page {
          min-height: 100vh;
          padding-bottom: 2rem;
        }

        .page-header {
          padding: 1.5rem 1rem;
          text-align: center;
        }

        .page-header h1 {
          font-size: 1.75rem;
          font-weight: 800;
          color: white;
          margin: 0 0 0.25rem 0;
        }

        .page-header p {
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
          font-size: 0.875rem;
        }

        .stats-banner {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          margin: 0 1rem 1rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 60px;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
        }

        .stat-value.pending { color: #fbbf24; }
        .stat-value.correct { color: #4ade80; }
        .stat-value.resolved { color: #60a5fa; }
        .stat.accuracy .stat-value { 
          color: var(--neon-lime, #a3e635); 
          font-size: 1.75rem;
        }

        .stat-label {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-filter {
          display: flex;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          overflow-x: auto;
        }

        .status-btn {
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.8rem;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .status-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .status-btn.active {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
          color: white;
        }

        .status-btn.active.correct {
          background: rgba(74, 222, 128, 0.2);
          border-color: #4ade80;
        }

        .status-btn.active.incorrect {
          background: rgba(248, 113, 113, 0.2);
          border-color: #f87171;
        }

        .predictions-list {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 1rem;
          margin: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #f87171;
        }

        .error-message button {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          padding: 0.4rem 0.8rem;
          border-radius: 8px;
          color: white;
          cursor: pointer;
        }

        .loading {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .loading-card {
          height: 100px;
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 12px;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
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

        /* Tabs */
        .tabs {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 0 1rem;
        }

        .tab-btn {
          padding: 0.75rem 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .tab-btn.active {
          background: #3b82f6; /* Blue-500 */
          color: white;
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        /* Portfolio View */
        .portfolio-view {
          padding: 0 1rem;
          animation: fadeIn 0.3s ease;
        }

        .portfolio-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          margin-bottom: 2rem;
        }

        .p-stat {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .p-stat .label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .p-stat .value {
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
        }

        .p-stat .value.green { color: #4ade80; }
        .p-stat .value.red { color: #f87171; }

        .chart-container {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 16px;
          padding: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .chart-container h3 {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
          margin: 0 0 1rem 0;
          text-align: center;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// Individual prediction card
function PredictionHistoryCard({ prediction }: { prediction: Prediction }) {
  const confidence = getConfidenceLevel(prediction.hybrid_confidence);
  const isResolved = prediction.is_correct !== null;
  const isCorrect = prediction.is_correct === true;

  return (
    <div className={`prediction-card ${isResolved ? (isCorrect ? 'correct' : 'incorrect') : 'pending'}`}>
      {/* Status indicator */}
      <div className="status-indicator">
        {!isResolved && <span className="status-emoji">⏳</span>}
        {isResolved && isCorrect && <span className="status-emoji">✅</span>}
        {isResolved && !isCorrect && <span className="status-emoji">❌</span>}
      </div>

      {/* Content */}
      <div className="card-content">
        <div className="card-header">
          <span className="sport-badge">{prediction.sport.toUpperCase()}</span>
          <span className="date">
            {new Date(prediction.created_at).toLocaleDateString()}
          </span>
        </div>

        <h3 className="event-name">{prediction.event_name}</h3>

        <div className="prediction-details">
          <div className="pick">
            <span className="label">Pick:</span>
            <span className="value">{prediction.predicted_outcome}</span>
          </div>
          <div className="confidence">
            <span className="label">Confidence:</span>
            <span className="value" style={{ color: confidence.color }}>
              {formatConfidencePercent(prediction.hybrid_confidence)}
            </span>
          </div>
        </div>

        {isResolved && (
          <div className="resolution">
            <span className="label">Result:</span>
            <span className={`result ${isCorrect ? 'win' : 'loss'}`}>
              {isCorrect ? 'WIN' : 'LOSS'}
            </span>
            {prediction.actual_outcome && (
              <span className="actual">Actual: {prediction.actual_outcome}</span>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .prediction-card {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          transition: all 0.2s;
        }

        .prediction-card:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .prediction-card.correct {
          border-left: 3px solid #4ade80;
        }

        .prediction-card.incorrect {
          border-left: 3px solid #f87171;
        }

        .prediction-card.pending {
          border-left: 3px solid #fbbf24;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          font-size: 1.5rem;
        }

        .card-content {
          flex: 1;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .sport-badge {
          font-size: 0.65rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          letter-spacing: 0.5px;
        }

        .date {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
        }

        .event-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: white;
          margin: 0 0 0.5rem 0;
          line-height: 1.3;
        }

        .prediction-details {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .pick, .confidence {
          display: flex;
          gap: 0.35rem;
          font-size: 0.8rem;
        }

        .label {
          color: rgba(255, 255, 255, 0.5);
        }

        .value {
          color: white;
          font-weight: 600;
        }

        .resolution {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          padding-top: 0.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .result {
          font-weight: 700;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
        }

        .result.win {
          background: rgba(74, 222, 128, 0.2);
          color: #4ade80;
        }

        .result.loss {
          background: rgba(248, 113, 113, 0.2);
          color: #f87171;
        }

        .actual {
          color: rgba(255, 255, 255, 0.5);
          margin-left: auto;
        }
      `}</style>
    </div>
  );
}

export default PredictionsHistoryPage;
