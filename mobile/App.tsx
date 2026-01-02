import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { theme, getSportEmoji, formatConfidence } from './theme';
import { useMarkets, getPrediction, SportMarket } from './hooks/useMarkets';

// Sport filter options
const SPORT_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'nfl', label: '🏈 NFL' },
  { key: 'nba', label: '🏀 NBA' },
  { key: 'nhl', label: '🏒 NHL' },
  { key: 'mma', label: '🥊 MMA' },
];

function MarketCard({ market }: { market: SportMarket }) {
  const { pick, confidence } = getPrediction(market);
  
  return (
    <View style={styles.marketCard}>
      <View style={styles.marketHeader}>
        <Text style={styles.sportEmoji}>{getSportEmoji(market.sport)}</Text>
        <Text style={styles.sportLabel}>{market.sport.toUpperCase()}</Text>
      </View>
      
      <Text style={styles.marketQuestion} numberOfLines={2}>
        {market.question}
      </Text>
      
      <View style={styles.predictionRow}>
        <View style={styles.predictionBadge}>
          <Text style={styles.predictionText}>
            Forecast: <Text style={styles.pickText}>{pick}</Text>
          </Text>
        </View>
        
        <View style={[styles.confidenceBadge, pick === 'YES' ? styles.confidenceYes : styles.confidenceNo]}>
          <Text style={styles.confidenceText}>{formatConfidence(confidence)}</Text>
        </View>
      </View>
      
      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${confidence * 100}%` },
            pick === 'YES' ? styles.progressYes : styles.progressNo
          ]} 
        />
      </View>
    </View>
  );
}

export default function App() {
  const [sportFilter, setSportFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  
  const { markets, loading, error, lastUpdated, refresh } = useMarkets({
    sport: sportFilter,
    limit: 30,
    autoRefresh: true,
    refreshInterval: 60000,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>⚡ PolyPick</Text>
        <View style={styles.liveIndicator}>
          <View style={styles.pulseDot} />
          <Text style={styles.liveText}>
            {loading ? 'Updating...' : 'Live'}
          </Text>
        </View>
      </View>
      
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{markets.length}</Text>
          <Text style={styles.statLabel}>Markets</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {lastUpdated ? lastUpdated.toLocaleTimeString().slice(0, 5) : '--:--'}
          </Text>
          <Text style={styles.statLabel}>Updated</Text>
        </View>
      </View>
      
      {/* Sport Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {SPORT_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterBtn,
              sportFilter === filter.key && styles.filterActive
            ]}
            onPress={() => setSportFilter(filter.key)}
          >
            <Text style={[
              styles.filterText,
              sportFilter === filter.key && styles.filterTextActive
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Markets List */}
      <ScrollView
        style={styles.marketsList}
        contentContainerStyle={styles.marketsContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.neonLime}
          />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : markets.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No markets found</Text>
          </View>
        ) : (
          markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))
        )}
      </ScrollView>
      
      {/* Bottom Tab Bar Placeholder */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem}>
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={[styles.tabLabel, styles.tabActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Text style={styles.tabIcon}>📊</Text>
          <Text style={styles.tabLabel}>Markets</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Text style={styles.tabIcon}>💼</Text>
          <Text style={styles.tabLabel}>Portfolio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Text style={styles.tabIcon}>⚙️</Text>
          <Text style={styles.tabLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgApp,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  logo: {
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(204, 255, 0, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.2)',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.neonLime,
    marginRight: 6,
  },
  liveText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.neonLime,
  },
  
  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.borderSubtle,
  },
  
  // Filters
  filterContainer: {
    maxHeight: 50,
    marginBottom: theme.spacing.md,
  },
  filterContent: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  filterBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.radius.md,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  filterActive: {
    backgroundColor: theme.colors.neonLime,
    borderColor: theme.colors.neonLime,
  },
  filterText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: '#000',
  },
  
  // Markets List
  marketsList: {
    flex: 1,
  },
  marketsContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  
  // Market Card
  marketCard: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  marketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sportEmoji: {
    fontSize: 18,
    marginRight: theme.spacing.sm,
  },
  sportLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.textTertiary,
  },
  marketQuestion: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    lineHeight: 22,
  },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  predictionBadge: {
    flexDirection: 'row',
  },
  predictionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  pickText: {
    color: theme.colors.neonLime,
    fontWeight: '700',
  },
  confidenceBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  confidenceYes: {
    backgroundColor: 'rgba(204, 255, 0, 0.15)',
  },
  confidenceNo: {
    backgroundColor: 'rgba(255, 0, 255, 0.15)',
  },
  confidenceText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.neonLime,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressYes: {
    backgroundColor: theme.colors.neonLime,
  },
  progressNo: {
    backgroundColor: theme.colors.neonPink,
  },
  
  // Error/Empty states
  errorContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  errorText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
  },
  retryBtn: {
    backgroundColor: theme.colors.neonLime,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
  },
  retryText: {
    color: '#000',
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    paddingVertical: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
  },
  tabActive: {
    color: theme.colors.neonLime,
  },
});
