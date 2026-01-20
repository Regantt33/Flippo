import { Colors } from '@/constants/Colors';
import { FlippoNotification, GmailService } from '@/services/gmail';
import { StorageService } from '@/services/storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

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
  const [notifications, setNotifications] = useState<FlippoNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
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

    const notifs = await GmailService.getNotifications();
    setNotifications(notifs);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await GmailService.checkForNewEmails();
    await loadData();
    setRefreshing(false);
  };

  const handleNotificationPress = async (n: FlippoNotification) => {
    router.push({ pathname: '/(tabs)/browser', params: { site: n.platform } });
    await GmailService.markAsRead(n.id);
    loadData();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'sale': return 'dollar';
      case 'offer': return 'handshake-o';
      case 'message': return 'envelope';
      default: return 'bell';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.date}>{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()}</Text>
            <Text style={styles.pageTitle}>Dashboard</Text>
          </View>
          <PremiumButton onPress={() => router.push('/(tabs)/profile')} style={styles.avatarBtn}>
            <View style={styles.avatarPlaceholder}>
              <FontAwesome name="user-o" size={20} color={Colors.light.primary} />
            </View>
          </PremiumButton>
        </View>

        {/* Hero Stats Section */}
        <View style={styles.heroStats}>
          <View style={styles.heroMainStat}>
            <Text style={styles.heroValue}>€{stats.value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.heroLabel}>Valore Totale Inventario</Text>
          </View>
          <View style={styles.heroSubStats}>
            <View style={styles.subStatItem}>
              <Text style={styles.subStatValue}>{stats.active}</Text>
              <Text style={styles.subStatLabel}>In Vendita</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.subStatItem}>
              <Text style={styles.subStatValue}>{stats.draft}</Text>
              <Text style={styles.subStatLabel}>Bozze</Text>
            </View>
          </View>
        </View>

        {/* Sync Card */}
        <PremiumButton style={styles.syncCard} onPress={onRefresh}>
          <View style={[styles.syncIconBox, { backgroundColor: Colors.light.primary + '15' }]}>
            <FontAwesome name="refresh" size={18} color={Colors.light.primary} />
          </View>
          <View style={styles.syncInfo}>
            <Text style={styles.syncTitle}>Controlla Vendite</Text>
            <Text style={styles.syncSubtitle}>{refreshing ? "Scansione in corso..." : "Sincronizza i marketplace"}</Text>
          </View>
          <FontAwesome name="chevron-right" size={14} color="#C7C7CC" />
        </PremiumButton>

        {/* UNIFIED FEED */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Attività Recenti</Text>
          <PremiumButton onPress={() => router.push('/(tabs)/inventory')}>
            <Text style={styles.seeAllText}>Vedi Tutto</Text>
          </PremiumButton>
        </View>

        <View style={styles.feedContainer}>
          {notifications.filter(n => !n.read).length === 0 ? (
            <View style={styles.emptyFeed}>
              <View style={[styles.emptyIconBox, { backgroundColor: '#F2F2F7' }]}>
                <FontAwesome name="coffee" size={24} color="#8E8E93" />
              </View>
              <Text style={styles.emptyTitle}>Tutto Tranquillo</Text>
              <Text style={styles.emptySubtitle}>Nessuna nuova notifica dai marketplace.</Text>
            </View>
          ) : (
            notifications.filter(n => !n.read).map((n, idx) => (
              <View key={n.id}>
                <PremiumButton style={styles.listItem} onPress={() => handleNotificationPress(n)}>
                  <View style={styles.notifRow}>
                    <View style={[styles.iconBox, { backgroundColor: n.platform === 'vinted' ? '#09B1BA20' : n.platform === 'ebay' ? '#E5323820' : '#FF3B3020' }]}>
                      <FontAwesome name={getIcon(n.type) as any} size={16} color={n.platform === 'vinted' ? '#09B1BA' : n.platform === 'ebay' ? '#E53238' : '#FF3B30'} />
                    </View>
                    <View style={styles.notifContent}>
                      <View style={styles.notifTop}>
                        <Text style={styles.itemTitle} numberOfLines={1}>{n.title}</Text>
                        <Text style={styles.itemTime}>{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                      <Text style={styles.itemSubtitle} numberOfLines={1}>{n.body}</Text>
                    </View>
                  </View>
                </PremiumButton>
                {idx < notifications.filter(n => !n.read).length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  date: { fontSize: 11, fontWeight: '800', color: '#8E8E93', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1.2 },
  pageTitle: { fontSize: 34, fontWeight: '900', color: '#1C1C1E', letterSpacing: -1 },
  avatarBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

  heroStats: {
    backgroundColor: '#1C1C1E',
    borderRadius: 32,
    padding: 32,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
  heroMainStat: { alignItems: 'center', marginBottom: 24 },
  heroValue: { fontSize: 42, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1.5 },
  heroLabel: { fontSize: 14, color: '#8E8E93', fontWeight: '600', marginTop: 4 },
  heroSubStats: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#2C2C2E', paddingTop: 24 },
  subStatItem: { alignItems: 'center' },
  subStatValue: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  subStatLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  heroDivider: { width: 1, backgroundColor: '#2C2C2E', height: '60%', alignSelf: 'center' },

  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    padding: 20,
    borderRadius: 24,
    marginBottom: 32,
  },
  syncIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  syncInfo: { flex: 1 },
  syncTitle: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
  syncSubtitle: { fontSize: 13, color: '#8E8E93', fontWeight: '500', marginTop: 2 },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionHeader: { fontSize: 22, fontWeight: '900', color: '#1C1C1E', letterSpacing: -0.5 },
  seeAllText: { fontSize: 14, fontWeight: '700', color: Colors.light.primary },

  feedContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#F2F2F7',
    overflow: 'hidden',
  },
  listItem: { padding: 20 },
  notifRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  notifContent: { flex: 1 },
  notifTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemTitle: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
  itemTime: { fontSize: 12, color: '#C7C7CC', fontWeight: '600' },
  itemSubtitle: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F2F2F7', marginHorizontal: 20 },

  emptyFeed: { padding: 40, alignItems: 'center' },
  emptyIconBox: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#1C1C1E' },
  emptySubtitle: { fontSize: 14, color: '#8E8E93', marginTop: 4, textAlign: 'center', fontWeight: '500' },
});
