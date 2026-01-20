import { Colors } from '@/constants/Colors';
import { InventoryItem, StorageService } from '@/services/storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PremiumButton = ({ onPress, children, style, disabled }: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { transform: [{ scale }] }]}
      disabled={disabled}
    >
      {children}
    </AnimatedPressable>
  );
};

export default function InventoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  const loadItems = async () => {
    const data = await StorageService.getItems();
    setItems(data);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Elimina Oggeto",
      "Vuoi davvero rimuovere questo oggetto?",
      [
        { text: "Annulla", style: "cancel" },
        { text: "Elimina", style: "destructive", onPress: async () => { await StorageService.removeItem(id); loadItems(); } }
      ]
    );
  };

  const filteredItems = items.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const mainImage = item.images && item.images.length > 0 ? { uri: item.images[0] } : null;

    return (
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
          <Text style={styles.itemPrice}>€{parseFloat(item.price).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</Text>

          <View style={styles.mkContainer}>
            {item.listedOn?.map(id => (
              <View key={id} style={[styles.mkDot, { backgroundColor: id === 'vinted' ? '#09B1BA' : id === 'ebay' ? '#E53238' : '#FF3B30' }]} />
            ))}
            {(!item.listedOn || item.listedOn.length === 0) && (
              <Text style={styles.notListedText}>Non pubblicato</Text>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <PremiumButton
            style={[styles.actionBtn, { backgroundColor: '#F8F9FB' }]}
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
    )
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventario</Text>
        <PremiumButton style={styles.addFab} onPress={() => router.push('/new-item')}>
          <FontAwesome name="plus" size={18} color="#fff" />
        </PremiumButton>
      </View>

      <View style={styles.searchBox}>
        <FontAwesome name="search" size={14} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          placeholder="Cerca nell'inventario..."
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
            <Text style={styles.emptyTitle}>Inizia ora</Text>
            <Text style={styles.emptySubtitle}>Aggiungi il tuo primo oggetto e Flippo ti aiuterà a venderlo ovunque.</Text>
            <PremiumButton style={styles.emptyBtn} onPress={() => router.push('/new-item')}>
              <Text style={styles.emptyBtnText}>Aggiungi Prodotto</Text>
            </PremiumButton>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20
  },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#1C1C1E', letterSpacing: -1 },
  addFab: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1C1C1E', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    marginHorizontal: 24,
    marginBottom: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    height: 52,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#1C1C1E', fontWeight: '600' },

  listContainer: { paddingHorizontal: 24, paddingBottom: 120 },

  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  imageBox: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#F8F9FB' },
  itemImage: { width: 72, height: 72 },
  imagePlaceholder: { width: 72, height: 72, justifyContent: 'center', alignItems: 'center' },

  itemInfo: { flex: 1, marginLeft: 16 },
  itemTitle: { fontWeight: '800', fontSize: 16, color: '#1C1C1E', marginBottom: 2 },
  itemPrice: { color: '#8E8E93', fontWeight: '700', fontSize: 14, marginBottom: 8 },

  mkContainer: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  mkDot: { width: 10, height: 10, borderRadius: 5 },
  notListedText: { fontSize: 11, color: '#C7C7CC', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  emptyView: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F8F9FB', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: '#1C1C1E' },
  emptySubtitle: { fontSize: 15, color: '#8E8E93', textAlign: 'center', marginTop: 8, paddingHorizontal: 40, fontWeight: '500', lineHeight: 22 },
  emptyBtn: { marginTop: 32, backgroundColor: '#1C1C1E', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 20 },
  emptyBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
