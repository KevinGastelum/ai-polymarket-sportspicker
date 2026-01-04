import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePredictions } from '../hooks/usePredictions';
import { theme } from '../theme';
import { PredictionCard } from './PredictionCard';
import { formatCurrency } from '../services/sportsApi';

type Tab = 'history' | 'portfolio';

export function HistoryScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [statusFilter, setStatusFilter] = useState<'all' | 'correct' | 'incorrect'>('all');
  
  const { 
    predictions, 
    stats,
    loading, 
    error, 
    refresh 
  } = usePredictions();

  // Portfolio Calculation (Simplified for Mobile)
  const INITIAL_BALANCE = 1000;
  const BET_AMOUNT = 50;
  
  const portfolioStats = React.useMemo(() => {
    let balance = INITIAL_BALANCE;
    const sorted = [...predictions]
      .filter(p => p.is_correct !== null)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
    sorted.forEach(p => {
       const price = Math.max(0.01, Math.min(0.99, (p.hybrid_confidence || 0.5) - 0.05));
       const pnl = p.is_correct 
        ? (BET_AMOUNT / price) - BET_AMOUNT 
        : -BET_AMOUNT;
       balance += pnl;
    });

    const totalPnL = balance - INITIAL_BALANCE;
    const roi = (totalPnL / INITIAL_BALANCE) * 100;
    
    return {
      balance,
      totalPnL,
      roi,
      totalBets: sorted.length
    };
  }, [predictions]);

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>History & Performance</Text>
      
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'portfolio' && styles.activeTab]}
          onPress={() => setActiveTab('portfolio')}
        >
          <Text style={[styles.tabText, activeTab === 'portfolio' && styles.activeTabText]}>Portfolio</Text>
        </TouchableOpacity>
      </View>

      {/* Stats or Filters based on Tab */}
      {activeTab === 'portfolio' ? (
        <View style={styles.portfolioContainer}>
          <View style={styles.pStatRow}>
            <View style={styles.pStat}>
              <Text style={styles.pLabel}>Balance</Text>
              <Text style={[styles.pValue, portfolioStats.totalPnL >= 0 ? styles.green : styles.red]}>
                ${portfolioStats.balance.toFixed(2)}
              </Text>
            </View>
            <View style={styles.pStat}>
              <Text style={styles.pLabel}>ROI</Text>
              <Text style={[styles.pValue, portfolioStats.roi >= 0 ? styles.green : styles.red]}>
                {portfolioStats.roi > 0 ? '+' : ''}{portfolioStats.roi.toFixed(1)}%
              </Text>
            </View>
          </View>
          <View style={styles.pStatRow}>
            <View style={styles.pStat}>
              <Text style={styles.pLabel}>Total PnL</Text>
              <Text style={[styles.pValue, portfolioStats.totalPnL >= 0 ? styles.green : styles.red]}>
                {portfolioStats.totalPnL > 0 ? '+' : ''}${portfolioStats.totalPnL.toFixed(2)}
              </Text>
            </View>
             <View style={styles.pStat}>
              <Text style={styles.pLabel}>Bets</Text>
              <Text style={styles.pValue}>{portfolioStats.totalBets}</Text>
            </View>
          </View>
          <Text style={styles.disclaimer}>Simulating $50 bets on all model picks</Text>
        </View>
      ) : (
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, styles.green]}>{stats.correct}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
           <View style={styles.stat}>
            <Text style={[styles.statValue, styles.accuracy]}>
              {stats.resolved > 0 ? ((stats.correct/stats.resolved)*100).toFixed(0) : 0}%
            </Text>
            <Text style={styles.statLabel}>Acc</Text>
          </View>
        </View>
      )}
    </View>
  );

  const filteredData = predictions.filter(p => {
    if (activeTab === 'portfolio') return p.is_correct !== null;
    return true; // History shows all
  });

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      {loading && predictions.length === 0 ? (
        <Text style={styles.loadingText}>Loading history...</Text>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <PredictionCard prediction={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.colors.text} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No predictions found.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 16,
    paddingTop: 60,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 16,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#000',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  portfolioContainer: {
    paddingVertical: 8,
  },
  pStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  pLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  pValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  green: { color: theme.colors.success },
  red: { color: theme.colors.error },
  accuracy: { color: theme.colors.accent },
  listContent: {
    padding: 16,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  disclaimer: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
});
