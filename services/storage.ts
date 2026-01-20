
import AsyncStorage from '@react-native-async-storage/async-storage';

export type InventoryCategory =
    | 'Fashion' | 'Women' | 'Men' | 'Kids'
    | 'Electronics' | 'Videogames'
    | 'Home' | 'Entertainment'
    | 'Sports' | 'Collectibles'
    | 'Pets' | 'Motors' | 'Other';

export type InventoryItem = {
    id: string;
    title: string;
    description: string;
    price: string;
    images: string[];
    category: InventoryCategory;

    // Common Core
    brand?: string;
    condition?: string; // New, Like New, Good, Fair
    color?: string; // Hex or Name
    quantity: number;

    // Fashion (Women, Men, Kids)
    size?: string;
    material?: string;

    // Luxury / Collectibles (Authentication)
    hasBox?: boolean;
    hasPapers?: boolean;
    hasReceipt?: boolean;

    // Electronics / Tech
    model?: string;
    specs?: string; // e.g. "256GB, 16GB RAM"
    serialNumber?: string;

    // Videogames / Media
    platform?: string; // PS5, Xbox
    isbn?: string; // Books

    // Motors
    year?: string;
    kms?: string;
    vin?: string;

    // Shipping / Logistics
    weight?: string; // in kg
    dimensions?: string; // LxWxH

    status: 'Active' | 'Draft' | 'Sold';
    listedOn?: string[]; // Array of marketplace IDs e.g. ['vinted', 'ebay']
    createdAt: number;
};

const STORAGE_KEY = '@flippo_inventory';

export const StorageService = {
    getItems: async (): Promise<InventoryItem[]> => {
        try {
            const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : [];
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    addItem: async (item: Omit<InventoryItem, 'id' | 'createdAt'>): Promise<InventoryItem> => {
        try {
            const currentItems = await StorageService.getItems();
            const newItem: InventoryItem = {
                ...item,
                id: Date.now().toString(),
                createdAt: Date.now(),
            };
            const updatedItems = [newItem, ...currentItems];
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));
            return newItem;
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    removeItem: async (id: string) => {
        try {
            const currentItems = await StorageService.getItems();
            const updatedItems = currentItems.filter(i => i.id !== id);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));
        } catch (e) {
            console.error(e);
        }
    },

    updateItem: async (id: string, updates: Partial<InventoryItem>) => {
        try {
            const currentItems = await StorageService.getItems();
            const updatedItems = currentItems.map(item =>
                item.id === id ? { ...item, ...updates } : item
            );
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));
            return updatedItems.find(i => i.id === id);
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    clearAll: async () => {
        try {
            await AsyncStorage.clear();
        } catch (e) {
            console.error(e);
        }
    }
};
