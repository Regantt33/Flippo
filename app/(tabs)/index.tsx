import { SwipeWrapper } from '@/components/SwipeWrapper';
import { Colors } from '@/constants/Colors';
import { GmailService, SellyNotification } from '@/services/gmail';
import { SettingsService, UserProfile } from '@/services/settings';
import { StorageService } from '@/services/storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Animated, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PremiumButton = ({ onPress, children, style }: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
};

export default function DashboardScreen() {
  const [stats, setStats] = useState({ active: 0, draft: 0, value: 0 });
  const [notifications, setNotifications] = useState<SellyNotification[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'vinted' | 'ebay' | 'subito'>('all');
  const router = useRouter();

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
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Image
                source={require('@/assets/images/selly-logo.png')}
                style={{ width: 40, height: 40, marginBottom: 8 }}
                resizeMode="contain"
              // tintColor="#1C1C1E" // Optional: if logo is black, no need. If it's multi-color, keep original.
              />
              <Text style={styles.welcomeText}>BENTORNATA,</Text>
              <Text style={styles.pageTitle}>{profile?.name}</Text>
            </View>
            <PremiumButton onPress={() => router.push('/(tabs)/profile')} style={styles.avatarBtn}>
              {profile?.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: Colors.light.primary + '15' }]}>
                  <FontAwesome name="user-o" size={18} color={Colors.light.primary} />
                </View>
              )}
            </PremiumButton>
          </View>

          {/* Condensed Summary Tiles */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue}>€{stats.value.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</Text>
              <Text style={styles.summaryLabel}>Valore</Text>
            </View>
            <View style={styles.tileDivider} />
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue}>{stats.active}</Text>
              <Text style={styles.summaryLabel}>Attivi</Text>
            </View>
            <View style={styles.tileDivider} />
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue}>{stats.draft}</Text>
              <Text style={styles.summaryLabel}>Bozze</Text>
            </View>
          </View>

          {/* Marketplace Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
            {['all', 'vinted', 'ebay', 'subito'].map((f) => (
              <PremiumButton
                key={f}
                onPress={() => setActiveFilter(f as any)}
                style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
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
                <View key={n.id}>
                  <PremiumButton style={styles.listItem} onPress={() => handleNotificationPress(n)}>
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
                </View>
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
  container: { flex: 1, backgroundColor: '#FEFBF8' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 150 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  welcomeText: { fontSize: 13, fontWeight: '700', color: Colors.light.icon, textTransform: 'uppercase', letterSpacing: 0.8 },
  pageTitle: { fontSize: 32, fontWeight: '900', color: Colors.light.text, letterSpacing: -1 },
  avatarBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: Colors.light.surface, overflow: 'hidden' },
  avatarPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarImg: { width: '100%', height: '100%' },

  summaryBar: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  summaryTile: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '900', color: Colors.light.text },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: Colors.light.icon, marginTop: 4, textTransform: 'uppercase' },
  tileDivider: { width: 1, height: 24, backgroundColor: Colors.light.surfaceHighlight },

  filterBar: { gap: 10, marginBottom: 20, paddingRight: 40 },
  filterChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, backgroundColor: Colors.light.surface, borderWidth: 1, borderColor: Colors.light.surfaceHighlight },
  filterChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  filterText: { fontSize: 14, fontWeight: '700', color: Colors.light.icon },
  filterTextActive: { color: '#FFFFFF' },

  feedContainer: {
    backgroundColor: Colors.light.background,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.light.surfaceHighlight,
    paddingVertical: 10,
    minHeight: 300,
  },
  listItem: { padding: 18 },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconBox: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16, marginTop: 4 },
  notifContent: { flex: 1 },
  notifTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  notifPlatform: { fontSize: 11, fontWeight: '900', color: Colors.light.icon, letterSpacing: 1 },
  itemTime: { fontSize: 11, color: '#C7C7CC', fontWeight: '600' },
  itemTitle: { fontSize: 16, fontWeight: '800', color: Colors.light.text, marginBottom: 2 },
  itemSubtitle: { fontSize: 14, color: Colors.light.icon, fontWeight: '500' },
  divider: { height: 1, backgroundColor: Colors.light.surfaceHighlight, marginHorizontal: 18 },

  emptyFeed: { padding: 60, alignItems: 'center', justifyContent: 'center' },
  emptyIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.light.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1E' },
  emptySubtitle: { fontSize: 14, color: '#8E8E93', marginTop: 4, textAlign: 'center', fontWeight: '500', lineHeight: 20 },

  fabSync: { display: 'none', position: 'absolute', bottom: 100, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#1C1C1E', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 5 },
  rotate: { transform: [{ rotate: '45deg' }] } // Simple indicator
});
