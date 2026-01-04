import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  Image,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Home, 
  LineChart, 
  Briefcase, 
  Settings, 
  Trophy, 
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Brain,
} from 'lucide-react-native';
import { PurchasesPackage, PurchasesOffering } from 'react-native-purchases';
import { theme, getSportEmoji, formatConfidence, formatVolume } from './theme';
import { useMarkets, getPrediction, SportMarket } from './hooks/useMarkets';
import { useAuth } from './hooks/useAuth';
import { useSubscription } from './hooks/useSubscription';
import { usePredictions } from './hooks/usePredictions';
import { AuthScreen } from './components/AuthScreen';
import { PredictionCard } from './components/PredictionCard';
import { AccuracyStats } from './components/AccuracyStats';
import { HistoryScreen } from './components/HistoryScreen';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Sport filter options - All sports from Polymarket
const SPORT_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'nfl', label: '🏈 NFL' },
  { key: 'nba', label: '🏀 NBA' },
  { key: 'soccer', label: '⚽ Soccer' },
  { key: 'golf', label: '⛳ Golf' },
  { key: 'mma', label: '🥊 MMA' },
  { key: 'tennis', label: '🎾 Tennis' },
  { key: 'ncaa', label: '🎓 NCAA' },
  { key: 'nhl', label: '🏒 NHL' },
  { key: 'baseball', label: '⚾ MLB' },
  { key: 'f1', label: '🏎️ F1' },
  { key: 'esports', label: '🎮 Esports' },
  { key: 'cricket', label: '🏏 Cricket' },
  { key: 'chess', label: '♟️ Chess' },
  { key: 'boxing', label: '🥊 Boxing' },
  { key: 'rugby', label: '🏉 Rugby' },
];


// --- Components ---

// Locked Premium Market Card (shows blur + upgrade prompt)
function LockedMarketCard({ market, onUpgrade }: { market: SportMarket; onUpgrade: () => void }) {
  return (
    <TouchableOpacity onPress={onUpgrade} activeOpacity={0.95}>
      <LinearGradient
        colors={['rgba(28, 31, 38, 0.95)', 'rgba(35, 39, 48, 0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.marketCard}
      >
        {/* Blurred Content */}
        <View style={styles.marketHeader}>
          <Text style={styles.sportEmoji}>{getSportEmoji(market.sport)}</Text>
          <Text style={styles.sportLabel}>{market.sport.toUpperCase()}</Text>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>🔒 PRO</Text>
          </View>
        </View>
        
        <Text style={[styles.marketQuestion, {opacity: 0.4}]} numberOfLines={2}>
          {market.question}
        </Text>
        
        {/* Locked Overlay */}
        <View style={styles.lockedOverlay}>
          <Text style={styles.lockedIcon}>🔐</Text>
          <Text style={styles.lockedTitle}>Premium Prediction</Text>
          <Text style={styles.lockedSubtitle}>Unlock 85%+ accuracy picks</Text>
          <LinearGradient
            colors={[theme.colors.neonLime, '#aacc00']}
            style={styles.unlockBtn}
          >
            <Text style={styles.unlockBtnText}>Unlock Pro →</Text>
          </LinearGradient>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// Upgrade CTA Banner with urgency
function UpgradeBanner({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <LinearGradient
        colors={['#ff6b6b', '#ee5a24', '#ff6b6b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.upgradeBanner}
      >
        <View style={styles.bannerContent}>
          <View style={styles.bannerLeft}>
            <Text style={styles.bannerEmoji}>🔥</Text>
            <View>
              <Text style={styles.bannerTitle}>Limited Time: 50% OFF Pro</Text>
              <Text style={styles.bannerSubtitle}>Only 3 hours left • 87% win rate</Text>
            </View>
          </View>
          <View style={styles.bannerCta}>
            <Text style={styles.bannerCtaText}>GET PRO</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// Social Proof / Success Stories
function SocialProofBar() {
  return (
    <View style={styles.socialProofBar}>
      <View style={styles.proofItem}>
        <Text style={styles.proofNumber}>$2.4M+</Text>
        <Text style={styles.proofLabel}>Won by users</Text>
      </View>
      <View style={styles.proofDivider} />
      <View style={styles.proofItem}>
        <Text style={styles.proofNumber}>87%</Text>
        <Text style={styles.proofLabel}>Accuracy</Text>
      </View>
      <View style={styles.proofDivider} />
      <View style={styles.proofItem}>
        <Text style={styles.proofNumber}>15K+</Text>
        <Text style={styles.proofLabel}>Pro Users</Text>
      </View>
    </View>
  );
}

// Pricing Modal
function PricingModal({ 
  visible, 
  onClose,
  offerings,
  purchase,
  loading
}: { 
  visible: boolean; 
  onClose: () => void;
  offerings: PurchasesOffering | null;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  loading: boolean;
}) {
  const handlePurchase = async (pkg?: PurchasesPackage) => {
    if (!pkg) return;
    const success = await purchase(pkg);
    if (success) onClose();
  };

  const annualPackage = offerings?.annual;
  const monthlyPackage = offerings?.monthly;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={[theme.colors.bgApp, theme.colors.bgCard]}
          style={styles.pricingModalContent}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeX}>
            <Text style={styles.closeXText}>✕</Text>
          </TouchableOpacity>
          
          <Text style={styles.pricingTitle}>Unlock Premium Picks 🏆</Text>
          <Text style={styles.pricingSubtitle}>Join 15,000+ winning bettors</Text>
          
          <SocialProofBar />
          
          {/* Pricing Plans */}
          {annualPackage && (
            <TouchableOpacity 
              style={styles.pricePlanPopular}
              onPress={() => handlePurchase(annualPackage)}
              disabled={loading}
            >
              <View style={styles.planPopularBadge}>
                <Text style={styles.planPopularText}>BEST VALUE</Text>
              </View>
              <View style={styles.planRow}>
                <View>
                  <Text style={styles.planName}>Annual Pro</Text>
                  <Text style={styles.planPrice}>
                    <Text style={styles.planPriceStrike}>{annualPackage.product.priceString ? '$199' : ''}</Text> {annualPackage.product.priceString}/year
                  </Text>
                </View>
                <LinearGradient colors={[theme.colors.neonLime, '#aacc00']} style={styles.planBtn}>
                  {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.planBtnText}>Subscribe</Text>}
                </LinearGradient>
              </View>
              <Text style={styles.planSavings}>💰 Save 50% – Limited offer!</Text>
            </TouchableOpacity>
          )}
          
          {monthlyPackage && (
            <TouchableOpacity 
              style={styles.pricePlan}
              onPress={() => handlePurchase(monthlyPackage)}
              disabled={loading}
            >
              <View style={styles.planRow}>
                <View>
                  <Text style={styles.planName}>Monthly Pro</Text>
                  <Text style={styles.planPrice}>{monthlyPackage.product.priceString}/mo</Text>
                </View>
                <View style={styles.planBtnOutline}>
                  {loading ? <ActivityIndicator color={theme.colors.textSecondary} /> : <Text style={styles.planBtnOutlineText}>Subscribe</Text>}
                </View>
              </View>
            </TouchableOpacity>
          )}
          
          {/* Features List */}
          <View style={styles.featuresList}>
            <Text style={styles.featureItem}>✓ All premium predictions</Text>
            <Text style={styles.featureItem}>✓ Real-time alerts</Text>
            <Text style={styles.featureItem}>✓ 85%+ accuracy picks</Text>
            <Text style={styles.featureItem}>✓ Unlimited markets</Text>
          </View>
          
          <Text style={styles.guarantee}>🛡️ 7-day money back guarantee</Text>
        </LinearGradient>
      </View>
    </Modal>
  );
}

function MarketCard({ market, onPress }: { market: SportMarket; onPress: (m: SportMarket) => void }) {
  const { pick, confidence } = getPrediction(market);
  
  return (
    <TouchableOpacity onPress={() => onPress(market)} activeOpacity={0.9}>
      <LinearGradient
        colors={['rgba(28, 31, 38, 1)', 'rgba(35, 39, 48, 1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.marketCard}
      >
        <View style={styles.marketHeader}>
          <Text style={styles.sportEmoji}>{getSportEmoji(market.sport)}</Text>
          <Text style={styles.sportLabel}>{market.sport.toUpperCase()}</Text>
          <Trophy size={14} color={theme.colors.textTertiary} style={{marginLeft: 'auto'}} />
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
      </LinearGradient>
    </TouchableOpacity>
  );
}



// Settings Screen Component
function SettingsScreen({ 
  notificationsEnabled, 
  setNotificationsEnabled,
  autoRefreshEnabled,
  setAutoRefreshEnabled,
  userEmail,
  onLogout,
  isGuest,
  onSignIn
}: {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  autoRefreshEnabled: boolean;
  setAutoRefreshEnabled: (v: boolean) => void;
  userEmail?: string;
  onLogout: () => void;
  isGuest: boolean;
  onSignIn: () => void;

}) {
  return (
    <ScrollView style={styles.contentContainer} contentContainerStyle={styles.scrollContent}>
      {/* Account Section */}
      <Text style={styles.sectionTitle}>Account</Text>
      
      {isGuest ? (
        <TouchableOpacity 
          style={[styles.settingCard, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
          onPress={onSignIn}
        >
          <View>
            <Text style={styles.settingLabel}>Guest User</Text>
            <Text style={styles.settingDesc}>Tap to sign in or create account</Text>
          </View>
          <Text style={{ fontSize: 20 }}>→</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>Email</Text>
          <Text style={styles.settingDesc}>{userEmail || 'Not logged in'}</Text>
        </View>
      )}
      
      <Text style={styles.sectionTitle}>Preferences</Text>
      
      {/* Notification Toggle */}
      <View style={styles.settingRow}>
        <View>
          <Text style={styles.settingLabel}>Push Notifications</Text>
          <Text style={styles.settingDesc}>Get alerts for new predictions</Text>
        </View>
        <TouchableOpacity 
          style={[styles.toggle, notificationsEnabled && styles.toggleActive]}
          onPress={() => setNotificationsEnabled(!notificationsEnabled)}
        >
          <View style={[styles.toggleKnob, notificationsEnabled && styles.toggleKnobActive]} />
        </TouchableOpacity>
      </View>
      
      {/* Auto Refresh Toggle */}
      <View style={styles.settingRow}>
        <View>
          <Text style={styles.settingLabel}>Auto-Refresh Markets</Text>
          <Text style={styles.settingDesc}>Update every 60 seconds</Text>
        </View>
        <TouchableOpacity 
          style={[styles.toggle, autoRefreshEnabled && styles.toggleActive]}
          onPress={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
        >
          <View style={[styles.toggleKnob, autoRefreshEnabled && styles.toggleKnobActive]} />
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.sectionTitle, { marginTop: theme.spacing.xl }]}>About</Text>
      
      <View style={styles.settingCard}>
        <Text style={styles.settingLabel}>PolyPick</Text>
        <Text style={styles.settingDesc}>v1.0.0</Text>
      </View>
      
      <View style={styles.settingCard}>
        <Text style={styles.settingLabel}>Data Source</Text>
        <Text style={styles.settingDesc}>Polymarket Gamma API</Text>
      </View>
      
      <View style={styles.settingCard}>
        <Text style={styles.settingLabel}>Support</Text>
        <Text style={styles.settingDesc}>contact@polypick.app</Text>
      </View>
      
      {/* Logout Button */}
      {!isGuest && (
        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={onLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      )}
       {isGuest && (
        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={onLogout} // Treating 'logout' as 'exit guest mode' to return to auth screen
          activeOpacity={0.8}
        >
          <Text style={styles.logoutBtnText}>Exit Guest Mode</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// AI Predictions Screen Component
function AIPredictionsScreen() {
  const { predictions, stats, loading, error, refresh } = usePredictions({
    limit: 20,
    autoRefresh: true,
  });
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.neonLime}
          colors={[theme.colors.neonLime]}
        />
      }
    >
      {/* Header */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 }}>
          🤖 AI Predictions
        </Text>
        <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
          ML-powered sports market forecasts
        </Text>
      </View>

      {/* Accuracy Stats */}
      <AccuracyStats />

      {/* Stats Summary */}
      <View style={{
        flexDirection: 'row',
        marginBottom: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 12,
      }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{stats.total}</Text>
          <Text style={{ fontSize: 10, color: theme.colors.textTertiary }}>Total</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.neonLime }}>{stats.pending}</Text>
          <Text style={{ fontSize: 10, color: theme.colors.textTertiary }}>Pending</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#4ade80' }}>{stats.correct}</Text>
          <Text style={{ fontSize: 10, color: theme.colors.textTertiary }}>Correct</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#60a5fa' }}>{stats.resolved}</Text>
          <Text style={{ fontSize: 10, color: theme.colors.textTertiary }}>Resolved</Text>
        </View>
      </View>

      {/* Loading State */}
      {loading && predictions.length === 0 && (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.neonLime} />
          <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>
            Loading predictions...
          </Text>
        </View>
      )}

      {/* Error State */}
      {error && (
        <View style={{ 
          padding: 16, 
          backgroundColor: 'rgba(248, 113, 113, 0.1)', 
          borderRadius: 12,
          marginBottom: 16,
        }}>
          <Text style={{ color: '#f87171', textAlign: 'center' }}>{error}</Text>
        </View>
      )}

      {/* Predictions List */}
      {predictions.map((prediction) => (
        <PredictionCard key={prediction.id} prediction={prediction} />
      ))}

      {/* Empty State */}
      {!loading && predictions.length === 0 && !error && (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🔮</Text>
          <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
            No predictions available yet.{'\n'}Check back soon!
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function MarketDetailModal({ market, visible, onClose, isFavorite, onToggleFavorite }: { 
  market: SportMarket | null; 
  visible: boolean; 
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  if (!market) return null;
  const { pick, confidence } = getPrediction(market);

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={[theme.colors.bgApp, theme.colors.bgCard]}
          style={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <ChevronLeft size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Market Details</Text>
            <TouchableOpacity onPress={onToggleFavorite} style={styles.closeBtn}>
              <Text style={{ fontSize: 20 }}>{isFavorite ? '⭐' : '☆'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{padding: theme.spacing.lg}}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailEmoji}>{getSportEmoji(market.sport)}</Text>
              <Text style={styles.detailSport}>{market.sport.toUpperCase()}</Text>
            </View>
            
            <Text style={styles.detailQuestion}>{market.question}</Text>
            
            <View style={styles.detailStats}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Volume</Text>
                <Text style={styles.statVal}>{formatVolume(market.volume || 0)}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>End Date</Text>
                <Text style={styles.statVal}>{market.endDate ? new Date(market.endDate).toLocaleDateString() : 'N/A'}</Text>
              </View>
            </View>

            {/* Mock Chart Area */}
            <View style={styles.chartPlaceholder}>
              <LineChart size={48} color={theme.colors.textTertiary} />
              <Text style={styles.chartText}>Price History Chart (Coming Soon)</Text>
            </View>

            <View style={styles.predictionLarge}>
              <Text style={styles.predLabel}>Our Forecast</Text>
              <View style={styles.predRow}>
                <Text style={[styles.predBig, pick === 'YES' ? styles.textGreen : styles.textPink]}>{pick}</Text>
                <Text style={styles.predConf}>{formatConfidence(confidence)} Confidence</Text>
              </View>
            </View>

            {/* Trade Actions */}
            <View style={styles.tradeActions}>
              <TouchableOpacity style={[styles.tradeBtn, styles.btnBuy]}>
                <Text style={styles.btnTextBlack}>Buy YES {Math.round(market.yesPrice * 100)}¢</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tradeBtn, styles.btnSell]}>
                <Text style={styles.btnTextBlack}>Buy NO {Math.round(market.noPrice * 100)}¢</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );
}

export default function App() {
  // Auth state
  const { isAuthenticated, isGuest, loading: authLoading, signIn, signUp, signOut, user, continueAsGuest } = useAuth();
  
  // Subscription state
  const { isPro, offerings, purchase, loading: subLoading } = useSubscription();
  
  const [sportFilter, setSportFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('markets');
  const [selectedMarket, setSelectedMarket] = useState<SportMarket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  
  const { markets, loading, error, lastUpdated, refresh } = useMarkets({
    sport: sportFilter,
    limit: 50,
    autoRefresh: autoRefreshEnabled,
    refreshInterval: 60000,
  });
  
  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="light" />
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⚡</Text>
        <ActivityIndicator size="large" color={theme.colors.neonLime} />
        <Text style={{ color: theme.colors.textSecondary, marginTop: 16 }}>Loading...</Text>
      </SafeAreaView>
    );
  }
  
  // Show auth screen when not logged in and not a guest
  if (!isAuthenticated && !isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <AuthScreen 
          onSignIn={signIn} 
          onSignUp={signUp} 
          onGuestLogin={continueAsGuest}
        />
      </SafeAreaView>
    );
  }

  // Filter markets by search query
  const filteredMarkets = markets.filter(m => 
    m.question.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const changeFilter = (filterKey: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSportFilter(filterKey);
  };

  const toggleFavorite = (marketId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFavorites(prev => 
      prev.includes(marketId) 
        ? prev.filter(id => id !== marketId)
        : [...prev, marketId]
    );
  };

  const renderContent = () => {
    if (activeTab === 'portfolio') {
      return (
        <HistoryScreen />
      );
    }

    if (activeTab === 'settings') {
      return (
        <SettingsScreen 
          notificationsEnabled={notificationsEnabled}
          setNotificationsEnabled={setNotificationsEnabled}
          autoRefreshEnabled={autoRefreshEnabled}
          setAutoRefreshEnabled={setAutoRefreshEnabled}
          userEmail={user?.email}
          onLogout={signOut}
          isGuest={isGuest}
          onSignIn={() => signOut()}
        />
      );
    }

    // AI Predictions Tab
    if (activeTab === 'ai') {
      return <AIPredictionsScreen />;
    }
    
    // Default: Markets / Home
    return (
      <View style={{flex: 1}}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search markets..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.searchClear}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.searchClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sport Filters - Only show on markets tab */}
        <View style={styles.filterWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={styles.filterContent}
          >
            {SPORT_FILTERS.map((filter) => {
              const isActive = sportFilter === filter.key;
              return (
                <TouchableOpacity
                  key={filter.key}
                  onPress={() => changeFilter(filter.key)}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={[theme.colors.neonLime, '#aacc00']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.filterBtn, styles.filterBtnActive]}
                    >
                      <Text style={[styles.filterText, styles.filterTextActive]}>
                        {filter.label}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.filterBtn}>
                      <Text style={styles.filterText}>
                        {filter.label}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

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
              <AlertCircle size={48} color={theme.colors.error} style={{marginBottom: theme.spacing.md}} />
              <Text style={styles.errorText}>Unable to fetch markets</Text>
              <Text style={styles.errorSubtext}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
                <RefreshCw size={16} color="#000" style={{marginRight: 8}} />
                <Text style={styles.retryText}>Retry Connection</Text>
              </TouchableOpacity>
            </View>
          ) : filteredMarkets.length === 0 && !loading ? (
            <View style={styles.emptyContainer}>
              <Search size={48} color={theme.colors.textTertiary} style={{marginBottom: theme.spacing.md}} />
              <Text style={styles.emptyText}>No markets found</Text>
              <Text style={styles.emptySubtext}>{searchQuery ? 'Try a different search' : 'Try selecting a different sport'}</Text>
            </View>
          ) : (
            <>
              {/* Upgrade Banner - show if not Pro */}
              {!isPro && <UpgradeBanner onPress={() => setPricingModalVisible(true)} />}

              {isPro ? (
                // Show ALL markets for Pro users
                filteredMarkets.map((market) => (
                  <MarketCard
                    key={market.id}
                    market={market}
                    onPress={(m) => setSelectedMarket(m)}
                  />
                ))
              ) : (
                <>
                  {/* Show 3 free cards */}
                  {filteredMarkets.slice(0, 3).map((market) => (
                    <MarketCard
                      key={market.id}
                      market={market}
                      onPress={(m) => setSelectedMarket(m)}
                    />
                  ))}

                  {/* Locked Premium Cards (show next 3) */}
                  {filteredMarkets.slice(3, 6).map((market) => (
                    <LockedMarketCard
                      key={market.id}
                      market={market}
                      onUpgrade={() => setPricingModalVisible(true)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>⚡ PolyPick</Text>
        <View style={styles.liveIndicator}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.neonLime} style={{marginRight: 6}} />
          ) : (
            <View style={styles.pulseDot} />
          )}
          <Text style={styles.liveText}>
            {loading ? 'Updating...' : 'Live'}
          </Text>
        </View>
      </View>

      {/* Content Area */}
      {renderContent()}

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('markets')}>
          <Home size={24} color={activeTab === 'markets' ? theme.colors.neonLime : theme.colors.textTertiary} />
          <Text style={[styles.tabLabel, activeTab === 'markets' && styles.tabActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('ai')}>
          <Brain size={24} color={activeTab === 'ai' ? theme.colors.neonLime : theme.colors.textTertiary} />
          <Text style={[styles.tabLabel, activeTab === 'ai' && styles.tabActive]}>AI</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('portfolio')}>
          <Briefcase size={24} color={activeTab === 'portfolio' ? theme.colors.neonLime : theme.colors.textTertiary} />
          <Text style={[styles.tabLabel, activeTab === 'portfolio' && styles.tabActive]}>Portfolio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('settings')}>
          <Settings size={24} color={activeTab === 'settings' ? theme.colors.neonLime : theme.colors.textTertiary} />
          <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabActive]}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <MarketDetailModal
        market={selectedMarket}
        visible={!!selectedMarket}
        onClose={() => setSelectedMarket(null)}
        isFavorite={selectedMarket ? favorites.includes(selectedMarket.id) : false}
        onToggleFavorite={() => selectedMarket && toggleFavorite(selectedMarket.id)}
      />

      {/* Pricing Modal */}
      <PricingModal 
        visible={pricingModalVisible} 
        onClose={() => setPricingModalVisible(false)}
        offerings={offerings}
        purchase={purchase}
        loading={subLoading}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgApp,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginTop: Platform.OS === 'android' ? 30 : 0,
    backgroundColor: theme.colors.bgApp,
    zIndex: 10,
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
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.neonLime,
    marginRight: 6,
  },
  liveText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.neonLime,
  },
  
  // Filters
  filterWrapper: {
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  filterContainer: {
    maxHeight: 40,
  },
  filterContent: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  filterBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.radius.full,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    minWidth: 60,
    alignItems: 'center',
  },
  filterBtnActive: {
    borderWidth: 0,
    paddingVertical: 9, 
    paddingHorizontal: theme.spacing.md + 1,
  },
  filterText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: '#000',
    fontWeight: '700',
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
    fontSize: 16,
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
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressYes: {
    backgroundColor: theme.colors.neonLime,
  },
  progressNo: {
    backgroundColor: theme.colors.neonPink,
  },
  
  // Portfolio Styles
  portfolioHeader: {
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.bgCard,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    alignItems: 'center',
  },
  portfolioLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  portfolioValue: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  pnlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neonLime,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  pnlText: {
    color: '#000',
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  portfolioCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  portfolioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  portfolioQuestion: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    flex: 1,
    marginRight: 8,
  },
  portfolioAmount: {
    color: theme.colors.textTertiary,
    fontSize: theme.fontSize.sm,
  },
  portfolioPick: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  portfolioPnl: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  textGreen: { color: theme.colors.neonLime },
  textRed: { color: theme.colors.neonPink },
  textPink: { color: theme.colors.neonPink },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    padding: 8,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  detailEmoji: {
    fontSize: 24,
    marginRight: theme.spacing.sm,
  },
  detailSport: {
    color: theme.colors.textTertiary,
    fontWeight: '700',
  },
  detailQuestion: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 28,
    marginBottom: theme.spacing.lg,
  },
  detailStats: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.bgCard,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  statVal: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderStyle: 'dashed',
  },
  chartText: {
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.sm,
  },
  predictionLarge: {
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.bgCard,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
  },
  predLabel: {
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  predRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  predBig: {
    fontSize: 24,
    fontWeight: '800',
  },
  predConf: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  
  // Trade Actions
  tradeActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: 'auto',
    marginBottom: 40,
  },
  tradeBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: theme.radius.full,
    alignItems: 'center',
  },
  btnBuy: {
    backgroundColor: theme.colors.neonLime,
  },
  btnSell: {
    backgroundColor: theme.colors.neonPink,
  },
  btnTextBlack: {
    color: '#000',
    fontWeight: '800',
    fontSize: theme.fontSize.md,
  },
  
  // Error/Empty states
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    marginTop: theme.spacing.xl,
  },
  errorText: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  errorSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neonLime,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
  },
  retryText: {
    color: '#000',
    fontWeight: '700',
    fontSize: theme.fontSize.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    marginTop: theme.spacing.xl,
    opacity: 0.7,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 4,
    fontWeight: '600',
  },
  tabActive: {
    color: theme.colors.neonLime,
  },

  // Settings Styles
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  settingLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  settingDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  settingCard: {
    backgroundColor: theme.colors.bgCard,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleActive: {
    backgroundColor: theme.colors.neonLime,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.textSecondary,
  },
  toggleKnobActive: {
    backgroundColor: '#000',
    alignSelf: 'flex-end',
  },
  
  // Search Bar
  searchContainer: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  searchClear: {
    position: 'absolute',
    right: theme.spacing.md,
    padding: theme.spacing.sm,
  },
  searchClearText: {
    color: theme.colors.textTertiary,
    fontSize: 16,
    fontWeight: '600',
  },

  // Pro Badge & Locked Cards
  proBadge: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  lockedOverlay: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  lockedIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  lockedTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  lockedSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  unlockBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.radius.full,
  },
  unlockBtnText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: '#000',
  },

  // Upgrade Banner
  upgradeBanner: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  bannerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
  },
  bannerCta: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
  },
  bannerCtaText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ee5a24',
  },

  // Social Proof Bar
  socialProofBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.lg,
  },
  proofItem: {
    alignItems: 'center',
  },
  proofNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.neonLime,
  },
  proofLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  proofDivider: {
    width: 1,
    backgroundColor: theme.colors.borderSubtle,
  },

  // Pricing Modal
  pricingModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: theme.spacing.xl,
    paddingBottom: 40,
    paddingHorizontal: theme.spacing.lg,
    maxHeight: '90%',
  },
  closeX: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeXText: {
    fontSize: 20,
    color: theme.colors.textSecondary,
  },
  pricingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  pricingSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  pricePlanPopular: {
    backgroundColor: 'rgba(190, 227, 0, 0.15)',
    borderWidth: 2,
    borderColor: theme.colors.neonLime,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    position: 'relative',
  },
  planPopularBadge: {
    position: 'absolute',
    top: -10,
    left: '50%',
    transform: [{ translateX: -40 }],
    backgroundColor: theme.colors.neonLime,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  planPopularText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
  },
  pricePlan: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  planPrice: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  planPriceStrike: {
    textDecorationLine: 'line-through',
    color: theme.colors.textTertiary,
  },
  planSavings: {
    fontSize: 12,
    color: theme.colors.neonLime,
    marginTop: 8,
    fontWeight: '600',
  },
  planBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: theme.radius.full,
  },
  planBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  planBtnOutline: {
    borderWidth: 1,
    borderColor: theme.colors.textTertiary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: theme.radius.full,
  },
  planBtnOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  featuresList: {
    marginBottom: theme.spacing.lg,
  },
  featureItem: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  guarantee: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  logoutBtn: {
    marginTop: theme.spacing.xl,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 14,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
