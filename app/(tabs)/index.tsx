import { Text, View } from '@/components/Themed';
import { Colors } from '@/constants/Colors';
import { FlippoNotification, GmailService } from '@/services/gmail';
import { StorageService } from '@/services/storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

export default function DashboardScreen() {
  const [stats, setStats] = useState({ active: 0, draft: 0, value: 0 });
  const [notifications, setNotifications] = useState<FlippoNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  const loadData = async () => {
    // Inventory Stats
    const items = await StorageService.getItems();
    const active = items.filter(i => i.status === 'Active').length;
    const draft = items.filter(i => i.status === 'Draft').length;
    const value = items.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0);
    setStats({ active, draft, value });

    // Gmail Notifications
    const notifs = await GmailService.getNotifications();
    setNotifications(notifs);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate Gmail Polling
    await GmailService.checkForNewEmails();
    await loadData();
    setRefreshing(false);
  };

  // Navigate to the marketplace and mark notification as "Handled"
  const handleNotificationPress = async (n: FlippoNotification) => {
    // 1. Open Browser (Action)
    // In real app: navigate to specific URL. Here: switch tab.
    router.push({ pathname: '/(tabs)/browser', params: { site: n.platform } });

    // 2. Optimistic Update: Mark as read immediately assuming user will handle it
    // Or we could show a modal "Did you reply?" upon return. 
    // User asked: "Once verified, don't show anymore".
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.date}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()}</Text>
            <Text style={styles.pageTitle}>Action Center</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/(tabs)/profile')}>
            <FontAwesome name="user-circle" size={36} color={Colors.light.icon} />
          </TouchableOpacity>
        </View>

        {/* Sync Action */}
        <TouchableOpacity style={styles.syncCard} onPress={onRefresh}>
          <View style={styles.syncInfo}>
            <Text style={styles.syncTitle}>Check Marketplaces</Text>
            <Text style={styles.syncSubtitle}>{refreshing ? "Scanning emails..." : "Tap to sync updates"}</Text>
          </View>
          <View style={[styles.refreshIconBox, { backgroundColor: Colors.light.primary }]}>
            <FontAwesome name="refresh" size={18} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* UNIFIED FEED (Priority) */}
        <Text style={styles.sectionHeader}>To Do ({notifications.filter(n => !n.read).length})</Text>
        <View style={styles.groupCard}>
          {notifications.filter(n => !n.read).length === 0 ? (
            <View style={{ padding: 30, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#E5F9E7', alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}>
                <FontAwesome name="check" size={30} color={Colors.light.success} />
              </View>
              <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>All Caught Up!</Text>
              <Text style={{ color: '#8E8E93', fontSize: 14, marginTop: 4, textAlign: 'center' }}>Great job. No pending actions.</Text>
            </View>
          ) : (
            notifications.filter(n => !n.read).map((n, idx) => (
              <View key={n.id}>
                <TouchableOpacity style={styles.listItem} onPress={() => handleNotificationPress(n)}>
                  <View style={styles.notifRow}>
                    <View style={[styles.iconBox, { backgroundColor: n.platform === 'vinted' ? '#09B1BA' : n.platform === 'ebay' ? '#E53238' : '#FF3B30' }]}>
                      <FontAwesome name={getIcon(n.type) as any} size={14} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.itemTitle} numberOfLines={1}>{n.title}</Text>
                        <Text style={styles.itemTime}>{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                      <Text style={styles.itemSubtitle} numberOfLines={1}>{n.body}</Text>
                      <View style={{ flexDirection: 'row', marginTop: 6 }}>
                        <Text style={{ fontSize: 12, color: Colors.light.primary, fontWeight: '600' }}>Tap to Handle & Dismiss ›</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
                {idx < notifications.filter(n => !n.read).length - 1 && <View style={styles.dividerFull} />}
              </View>
            ))
          )}
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionHeader}>My Store</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.light.primary }]}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.light.secondary }]}>{stats.draft}</Text>
            <Text style={styles.statLabel}>Drafts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.light.success }]}>€{stats.value}</Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  scrollContent: { padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, backgroundColor: 'transparent' },
  date: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginBottom: 4, textTransform: 'uppercase' },
  pageTitle: { fontSize: 34, fontWeight: 'bold', color: '#000', letterSpacing: -0.5 },
  profileBtn: { marginTop: 5 },
  syncCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  syncInfo: { flex: 1 },
  syncTitle: { fontSize: 17, fontWeight: '600', marginBottom: 2 },
  syncSubtitle: { fontSize: 13, color: '#8E8E93' },
  refreshIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { fontSize: 20, fontWeight: '700', color: '#000', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 30 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'flex-start',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statValue: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 13, fontWeight: '500', color: '#8E8E93' },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  groupTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  badge: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginLeft: 42,
  },
  dividerFull: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginLeft: 16,
  },
  listItem: {
    padding: 16,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemTime: { fontSize: 13, color: '#8E8E93' },
  dividerFull: { height: 1, backgroundColor: '#E5E5EA', marginLeft: 16 },
  actionRow: { padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa', borderTopWidth: 1, borderTopColor: '#f0f0f0', gap: 8 },
  actionText: { fontSize: 14, fontWeight: '500', color: '#8E8E93' },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  itemSubtitle: { fontSize: 13, color: '#8E8E93' }
});
