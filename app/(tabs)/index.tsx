import { AnimatedCard } from '@/components/AnimatedCard';
import { PremiumButton } from '@/components/PremiumButton';
import { SwipeWrapper } from '@/components/SwipeWrapper';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/Colors';
import { GmailService, SellyNotification } from '@/services/gmail';
import { SettingsService, UserProfile } from '@/services/settings';
import { StorageService } from '@/services/storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Animated Counter Component
const AnimatedCounter = ({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) => {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withSpring(value, {
      damping: 15,
      stiffness: 100,
    });
  }, [value]);

  const animatedText = useAnimatedStyle(() => ({
    opacity: withTiming(1, { duration: 300 }),
  }));

  return (
    <Animated.View style={animatedText}>
      <Text style={styles.summaryValue}>
        {prefix}{Math.round(animatedValue.value).toLocaleString('it-IT')}{suffix}
      </Text>
    </Animated.View>
  );
};

export default function DashboardScreen() {
  const [stats, setStats] = useState({ active: 0, draft: 0, value: 0 });
  const [notifications, setNotifications] = useState<SellyNotification[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'vinted' | 'ebay' | 'subito'>('all');
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  const loadData = async () => {
    const items = await StorageService.getItems();
    const active = items.filter(i => i.status === 'Active').length;
    const draft = items.filter(i => i.status === 'Draft').length;
    const value = items.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0);
    setStats({ active, draft, value });

    const p = await SettingsService.getProfile();
    setProfile(p);

    const notifs = await GmailService.getNotifications();
    setNotifications(notifs);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await GmailService.checkForNewEmails();
    await loadData();
    setRefreshing(false);
  };

  const handleNotificationPress = async (n: SellyNotification) => {
    router.push({ pathname: '/(tabs)/browser', params: { site: n.platform } });
    await GmailService.markAsRead(n.id);
    loadData();
  };

  const filteredNotifications = notifications.filter(n => {
    if (n.read) return false;
    if (activeFilter === 'all') return true;
    return n.platform === activeFilter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'sale': return 'dollar';
      case 'offer': return 'handshake-o';
      case 'message': return 'envelope';
      default: return 'bell';
    }
  };

  return (
    <SwipeWrapper rightRoute="/(tabs)/inventory">
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.primary} />}
        >
          {/* Decorative Background Elements */}
          <View style={styles.bgDecoration1} />
          <View style={styles.bgDecoration2} />
          <View style={styles.bgDecoration3} />
          {/* Hero Header - Refined and Integrated */}
          <View style={[styles.heroHeader, { paddingTop: Math.max(insets.top, Spacing.md) }]}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <Image
                  source={require('@/assets/images/selly-logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <View>
                  <Text style={styles.welcomeText}>BENTORNATA</Text>
                  <Text style={styles.heroTitle}>{profile?.name || 'Seller'}</Text>
                </View>
              </View>
              <PremiumButton onPress={() => router.push('/(tabs)/profile')} style={styles.avatarBtn}>
                <LinearGradient
                  colors={Gradients.accentWarm}
                  style={styles.avatarGradient}
                >
                  {profile?.avatar ? (
                    <Image source={{ uri: profile.avatar }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <FontAwesome name="user" size={20} color="#FFF" />
                    </View>
                  )}
                </LinearGradient>
              </PremiumButton>
            </View>
          </View>

          {/* Premium Stats Overview */}
          <View style={styles.statsOverviewContainer}>
            <View style={styles.statsOverview}>
              <View style={styles.statInfoBlock}>
                <Text style={styles.statLabelBig}>PRODOTTI ATTIVI</Text>
                <View style={styles.statValueRow}>
                  <FontAwesome name="shopping-bag" size={16} color={Colors.light.accent} style={{ marginRight: 10 }} />
                  <AnimatedCounter value={stats.active} />
                </View>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statInfoBlock}>
                <Text style={styles.statLabelBig}>BOZZE IN CORSO</Text>
                <View style={styles.statValueRow}>
                  <FontAwesome name="file-text-o" size={16} color={Colors.light.icon} style={{ marginRight: 10 }} />
                  <AnimatedCounter value={stats.draft} />
                </View>
              </View>
            </View>
          </View>

          {/* Marketplace Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
            {['all', 'vinted', 'ebay', 'subito'].map((f) => (
              <PremiumButton
                key={f}
                onPress={() => setActiveFilter(f as any)}
                style={[styles.filterChip, activeFilter === f ? styles.filterChipActive : {}]}
              >
                <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                  {f === 'all' ? 'Tutti' : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </PremiumButton>
            ))}
          </ScrollView>

          {/* NOTIFICATION FEED */}
          <View style={styles.feedContainer}>
            {filteredNotifications.length === 0 ? (
              <View style={styles.emptyFeed}>
                <View style={styles.emptyIconBox}>
                  <FontAwesome name="check-circle-o" size={32} color="#C7C7CC" />
                </View>
                <Text style={styles.emptyTitle}>Tutto Aggiornato</Text>
                <Text style={styles.emptySubtitle}>Nessuna attività richiesta per i filtri selezionati.</Text>
              </View>
            ) : (
              filteredNotifications.map((n, idx) => (
                <AnimatedCard key={n.id} delay={200 + (idx * 50)}>
                  <PremiumButton
                    style={styles.listItem}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      handleNotificationPress(n);
                    }}
                  >
                    <View style={styles.notifRow}>
                      <View style={[styles.iconBox, { backgroundColor: n.platform === 'vinted' ? '#09B1BA20' : n.platform === 'ebay' ? '#E5323820' : '#FF3B3020' }]}>
                        <FontAwesome name={getIcon(n.type) as any} size={16} color={n.platform === 'vinted' ? '#09B1BA' : n.platform === 'ebay' ? '#E53238' : '#FF3B30'} />
                      </View>
                      <View style={styles.notifContent}>
                        <View style={styles.notifTop}>
                          <Text style={styles.notifPlatform} numberOfLines={1}>{n.platform.toUpperCase()}</Text>
                          <Text style={styles.itemTime}>{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                        <Text style={styles.itemTitle} numberOfLines={1}>{n.title}</Text>
                        <Text style={styles.itemSubtitle} numberOfLines={1}>{n.body}</Text>
                      </View>
                    </View>
                  </PremiumButton>
                  {idx < filteredNotifications.length - 1 && <View style={styles.divider} />}
                </AnimatedCard>
              ))
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Quick Sync Action */}
        <PremiumButton style={styles.fabSync} onPress={onRefresh}>
          {refreshing ? <View style={styles.rotate}><FontAwesome name="refresh" size={20} color="#fff" /></View> : <FontAwesome name="refresh" size={20} color="#fff" />}
        </PremiumButton>
      </View>
    </SwipeWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  bgDecoration1: {
    position: 'absolute',
    top: -50,
    right: -20,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(214, 109, 69, 0.03)',
    zIndex: -1,
  },
  bgDecoration2: {
    position: 'absolute',
    top: 400,
    left: -60,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(214, 109, 69, 0.02)',
    zIndex: -1,
  },
  bgDecoration3: {
    position: 'absolute',
    bottom: 200,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: 'rgba(214, 109, 69, 0.05)',
    zIndex: -1,
  },
  scrollContent: { paddingBottom: 150 },

  // Hero Header with Gradient
  heroHeader: {
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logo: {
    width: 48,
    height: 48,
  },
  welcomeText: {
    ...Typography.label,
    color: Colors.light.icon,
    marginBottom: 4,
  },
  heroTitle: {
    ...Typography.display,
    color: Colors.light.text,
  },
  avatarBtn: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  avatarPlaceholder: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.md,
  },

  // Stats Redesign
  statsOverviewContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  statsOverview: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xxl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    ...Shadows.sm,
  },
  statInfoBlock: {
    flex: 1,
  },
  statLabelBig: {
    fontSize: 10,
    fontWeight: '800',
    color: '#BDB9B0',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 20,
  },
  // Filters
  filterBar: { gap: 12, marginBottom: Spacing.md, paddingHorizontal: Spacing.lg, paddingRight: 40 },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.surfaceHighlight,
    ...Shadows.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
    ...Shadows.accent,
  },
  filterText: { fontSize: 14, fontWeight: '700', color: Colors.light.icon },
  filterTextActive: { color: '#FFFFFF' },

  // Feed Container
  feedContainer: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    borderColor: Colors.light.surfaceHighlight,
    paddingVertical: 12,
    minHeight: 300,
    marginHorizontal: Spacing.lg,
    ...Shadows.sm,
  },

  // Notification Cards - Premium
  notifCard: {
    padding: Spacing.md,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  iconGradient: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  notifContent: {
    flex: 1,
  },
  notifTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notifTitle: {
    ...Typography.h3,
    color: Colors.light.text,
    marginBottom: 4,
  },
  notifBody: {
    ...Typography.body,
    color: Colors.light.icon,
  },

  // Backward compatibility styles
  summaryValue: {
    fontSize: 22,
    fontWeight: '900',
    color: 'inherit',
    letterSpacing: -0.5,
  },
  itemTime: {
    fontSize: 11,
    color: Colors.light.icon,
    fontWeight: '600',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
  },
  itemSubtitle: {
    fontSize: 14,
    color: Colors.light.icon,
    fontWeight: '500',
  },
  notifPlatform: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.light.icon,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.surfaceHighlight,
    marginHorizontal: Spacing.md,
  },
  listItem: {
    padding: Spacing.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyFeed: { padding: 60, alignItems: 'center', justifyContent: 'center' },
  emptyIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.light.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1E' },
  emptySubtitle: { fontSize: 14, color: '#8E8E93', marginTop: 4, textAlign: 'center', fontWeight: '500', lineHeight: 20 },

  fabSync: { display: 'none', position: 'absolute', bottom: 100, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#1C1C1E', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 5 },
  rotate: { transform: [{ rotate: '45deg' }] } // Simple indicator
});
