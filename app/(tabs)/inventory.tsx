import { AnimatedCard } from '@/components/AnimatedCard';
import { PremiumButton } from '@/components/PremiumButton';
import { SwipeWrapper } from '@/components/SwipeWrapper';
import { BorderRadius, Colors, Shadows } from '@/constants/Colors';
import { Translations } from '@/constants/Translations';
import { SettingsService } from '@/services/settings';
import { InventoryItem, StorageService } from '@/services/storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function InventoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState<'it' | 'en' | 'fr' | 'es' | 'de'>('en');

  const t = Translations[language] || Translations.en;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const data = await StorageService.getItems();
    setItems(data);
    const p = await SettingsService.getProfile();
    setLanguage(p.language);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      t.error,
      t.inventory_delete_confirm,
      [
        { text: t.cancel, style: "cancel" },
        { text: t.inventory_delete_btn, style: "destructive", onPress: async () => { await StorageService.removeItem(id); loadData(); } }
      ]
    );
  };

  const filteredItems = items.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const localeMap: Record<string, string> = { it: 'it-IT', en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE' };
  const locale = localeMap[language || 'en'] || 'en-US';

  const renderItem = ({ item, index }: { item: InventoryItem; index: number }) => {
    const mainImage = item.images && item.images.length > 0 ? { uri: item.images[0] } : null;

    return (
      <AnimatedCard delay={index * 50}>
        <View style={styles.itemCard}>
          <View style={styles.imageBox}>
            {mainImage ? (
              <Image source={mainImage} style={styles.itemImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <FontAwesome name="image" size={20} color="#C7C7CC" />
              </View>
            )}
          </View>

          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.itemPrice}>€{parseFloat(item.price).toLocaleString(locale, { minimumFractionDigits: 2 })}</Text>

            <View style={styles.mkContainer}>
              {item.listedOn?.map(id => (
                <View key={id} style={[styles.mkDot, { backgroundColor: id === 'vinted' ? '#09B1BA' : id === 'ebay' ? '#E53238' : '#FF3B30' }]} />
              ))}
              {(!item.listedOn || item.listedOn.length === 0) && (
                <Text style={styles.notListedText}>{t.inventory_not_published}</Text>
              )}
            </View>
          </View>

          <View style={styles.actions}>
            <PremiumButton
              style={[styles.actionBtn, { backgroundColor: Colors.light.surface }]}
              onPress={() => router.push({ pathname: '/new-item', params: { id: item.id } })}
            >
              <FontAwesome name="pencil" size={12} color="#8E8E93" />
            </PremiumButton>
            <PremiumButton
              style={[styles.actionBtn, { backgroundColor: Colors.light.primary + '10' }]}
              onPress={() => router.push({ pathname: '/new-item', params: { id: item.id, openWizard: 'true' } })}
            >
              <FontAwesome name="rocket" size={12} color={Colors.light.primary} />
            </PremiumButton>
            <PremiumButton
              style={[styles.actionBtn, { backgroundColor: '#FF3B3010' }]}
              onPress={() => handleDelete(item.id)}
            >
              <FontAwesome name="trash-o" size={12} color="#FF3B30" />
            </PremiumButton>
          </View>
        </View>
      </AnimatedCard>
    )
  };

  return (
    <SwipeWrapper leftRoute="/(tabs)" rightRoute="/(tabs)/browser">
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <Text style={styles.headerTitle}>{t.inventory_title}</Text>
          <PremiumButton style={styles.addFab} onPress={() => router.push('/new-item')}>
            <FontAwesome name="plus" size={18} color="#fff" />
          </PremiumButton>
        </View>

        {/* Decorative Background Elements */}
        <View style={styles.bgDecoration1} />
        <View style={styles.bgDecoration2} />

        <View style={styles.searchBox}>
          <FontAwesome name="search" size={14} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            placeholder={t.inventory_search_placeholder}
            placeholderTextColor="#C7C7CC"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <View style={styles.emptyIcon}>
                <FontAwesome name="cube" size={40} color="#F2F2F7" />
              </View>
              <Text style={styles.emptyTitle}>{t.inventory_empty_title}</Text>
              <Text style={styles.emptySubtitle}>{t.inventory_empty_subtitle}</Text>
              <PremiumButton style={styles.emptyBtn} onPress={() => router.push('/new-item')}>
                <Text style={styles.emptyBtnText}>{t.inventory_new_item}</Text>
              </PremiumButton>
            </View>
          }
        />
      </View>
    </SwipeWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFBF8' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20
  },
  headerTitle: { fontSize: 32, fontWeight: '900', color: Colors.light.text, letterSpacing: -1 },
  addFab: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.light.accent, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.light.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    marginHorizontal: 24,
    marginBottom: 24,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    height: 52,
    ...Shadows.sm,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: Colors.light.text, fontWeight: '600' },

  listContainer: { paddingHorizontal: 24, paddingBottom: 120 },

  itemCard: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.surfaceHighlight,
    ...Shadows.sm,
  },
  imageBox: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.light.surface,
  },
  itemImage: { width: 72, height: 72 },
  imagePlaceholder: { width: 72, height: 72, justifyContent: 'center', alignItems: 'center' },

  itemInfo: { flex: 1, marginLeft: 16 },
  itemTitle: { fontWeight: '800', fontSize: 16, color: Colors.light.text, marginBottom: 2 },
  itemPrice: { color: Colors.light.icon, fontWeight: '700', fontSize: 14, marginBottom: 8 },

  mkContainer: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  mkDot: { width: 10, height: 10, borderRadius: 5 },
  notListedText: { fontSize: 11, color: '#C7C7CC', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },

  emptyView: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Shadows.md,
  },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: Colors.light.text },
  emptySubtitle: { fontSize: 15, color: Colors.light.icon, textAlign: 'center', marginTop: 8, paddingHorizontal: 40, fontWeight: '500', lineHeight: 22 },
  emptyBtn: {
    marginTop: 32,
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    ...Shadows.accent,
  },
  emptyBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  bgDecoration1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(214, 109, 69, 0.03)',
    zIndex: -1,
  },
  bgDecoration2: {
    position: 'absolute',
    bottom: 100,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(214, 109, 69, 0.02)',
    zIndex: -1,
  },
});
