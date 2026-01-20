
import { Text, View } from '@/components/Themed';
import { Colors } from '@/constants/Colors';
import { InventoryItem, StorageService } from '@/services/storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

export default function InventoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);

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
      "Delete Item",
      "Are you sure you want to delete this item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await StorageService.removeItem(id);
            loadItems();
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const mainImage = item.images && item.images.length > 0 ? { uri: item.images[0] } : null;

    return (
      <View style={styles.itemCard}>
        {mainImage ? (
          <Image source={mainImage} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, { justifyContent: 'center', alignItems: 'center' }]}>
            <FontAwesome name="image" size={24} color="#555" />
          </View>
        )}

        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemPrice}>€{item.price}</Text>

          <View style={styles.metaRow}>
            {/* Marketplace Indicators */}
            <View style={styles.marketplaceRow}>
              {item.listedOn?.includes('vinted') && (
                <View style={[styles.mkBadge, { backgroundColor: '#09B1BA' }]}><Text style={styles.mkBadgeText}>Vinted</Text></View>
              )}
              {item.listedOn?.includes('ebay') && (
                <View style={[styles.mkBadge, { backgroundColor: '#E53238' }]}><Text style={styles.mkBadgeText}>eBay</Text></View>
              )}
              {item.listedOn?.includes('subito') && (
                <View style={[styles.mkBadge, { backgroundColor: '#FF3B30' }]}><Text style={styles.mkBadgeText}>Subito</Text></View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E5F9FF' }]} onPress={() => router.push({ pathname: '/new-item', params: { id: item.id, openWizard: 'true' } })}>
            <FontAwesome name="rocket" size={14} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFF0F0' }]} onPress={() => handleDelete(item.id)}>
            <FontAwesome name="trash" size={14} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    )
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={16} color="#aaa" style={styles.searchIcon} />
        <TextInput
          placeholder="Search inventory..."
          placeholderTextColor="#aaa"
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.headerTitle}>My Inventory</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/new-item')}>
              <FontAwesome name="plus" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Add New</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    margin: 20,
    paddingHorizontal: 15,
    borderRadius: 10,
    height: 45,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    gap: 5,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 15,
  },
  itemTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  itemPrice: {
    color: Colors.dark.success,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  badgeActive: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  badgeDraft: { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  badgeSold: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  badgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  editBtn: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  marketplaceRow: {
    flexDirection: 'row',
    gap: 6,
  },
  mkBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mkBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  }
});
