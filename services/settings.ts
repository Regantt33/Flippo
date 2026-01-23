
import AsyncStorage from '@react-native-async-storage/async-storage';

export type MarketplaceId = 'vinted' | 'ebay' | 'subito' | 'depop' | 'wallapop';

export interface MarketplaceConfig {
    id: MarketplaceId;
    name: string;
    isEnabled: boolean;
    isLoggedIn: boolean; // Managed manually or by simple cookie check heuristic
    lastSynced?: number;
    username?: string;
    icon: string; // FontAwesome name
    color: string;
    url: string;
    listingUrl: string;
}

export interface UserProfile {
    name: string;
    email: string;
    bio?: string;
    avatar?: string;
    language: 'it' | 'en' | 'fr' | 'es' | 'de';
}

const SETTINGS_KEY = '@selly_settings';
const PROFILE_KEY = '@selly_profile';

const DEFAULT_MARKETPLACES: MarketplaceConfig[] = [
    { id: 'vinted', name: 'Vinted', isEnabled: true, isLoggedIn: false, icon: 'shopping-bag', color: '#34C759', url: 'https://vinted.it', listingUrl: 'https://www.vinted.it/items/new' },
    { id: 'ebay', name: 'eBay', isEnabled: true, isLoggedIn: false, icon: 'gavel', color: '#FF9500', url: 'https://ebay.it', listingUrl: 'https://www.ebay.it/sl/sell' },
    { id: 'subito', name: 'Subito', isEnabled: true, isLoggedIn: false, icon: 'bell', color: '#FF3B30', url: 'https://subito.it', listingUrl: 'https://www.subito.it/inserisci.htm' },
    { id: 'wallapop', name: 'Wallapop', isEnabled: false, isLoggedIn: false, icon: 'star', color: '#00D1B2', url: 'https://wallapop.com', listingUrl: 'https://es.wallapop.com/item/new' },
    { id: 'depop', name: 'Depop', isEnabled: false, isLoggedIn: false, icon: 'heart', color: '#FF2D55', url: 'https://depop.com', listingUrl: 'https://www.depop.com/products/create/' },
];

export const SettingsService = {
    // Marketplaces
    getMarketplaces: async (): Promise<MarketplaceConfig[]> => {
        try {
            const jsonValue = await AsyncStorage.getItem(SETTINGS_KEY);
            if (jsonValue != null) {
                // Merge with defaults to ensure new platforms appear if added to code later
                const stored: MarketplaceConfig[] = JSON.parse(jsonValue);
                // Map stored settings onto defaults to preserve structure updates
                return DEFAULT_MARKETPLACES.map(def => {
                    const match = stored.find(s => s.id === def.id);
                    return match ? { ...def, ...match } : def;
                });
            }
            return DEFAULT_MARKETPLACES;
        } catch (e) {
            return DEFAULT_MARKETPLACES;
        }
    },

    updateMarketplace: async (id: MarketplaceId, updates: Partial<MarketplaceConfig>) => {
        try {
            const current = await SettingsService.getMarketplaces();
            const updated = current.map(m => m.id === id ? { ...m, ...updates } : m);
            await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
            return updated;
        } catch (e) {
            console.error(e);
        }
    },

    // Profile
    getProfile: async (): Promise<UserProfile> => {
        try {
            const json = await AsyncStorage.getItem(PROFILE_KEY);
            return json ? JSON.parse(json) : { name: 'Reseller', email: '', language: 'en' };
        } catch (e) {
            return { name: 'Reseller', email: '', language: 'en' }; // Default
        }
    },

    updateProfile: async (profile: Partial<UserProfile>) => {
        try {
            const current = await SettingsService.getProfile();
            const updated = { ...current, ...profile };
            await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
            return updated;
        } catch (e) {
            console.error(e);
        }
    }
};
