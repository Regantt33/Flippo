import AsyncStorage from '@react-native-async-storage/async-storage';

// Marketplace configuration
export interface MarketplaceConfig {
    id: string;
    name: string;
    loginUrl: string;
    listingUrl: string;
    color: string;
}

export const MARKETPLACES: MarketplaceConfig[] = [
    {
        id: 'vinted',
        name: 'Vinted',
        loginUrl: 'https://www.vinted.it/',
        listingUrl: 'https://www.vinted.it/items/new',
        color: '#09B1BA',
    },
    {
        id: 'ebay',
        name: 'eBay',
        loginUrl: 'https://www.ebay.it/',
        listingUrl: 'https://www.ebay.it/sl/sell',
        color: '#E53238',
    },
    {
        id: 'subito',
        name: 'Subito',
        loginUrl: 'https://www.subito.it/',
        listingUrl: 'https://www.subito.it/inserisci.htm',
        color: '#FF5F5F',
    },
    {
        id: 'depop',
        name: 'Depop',
        loginUrl: 'https://www.depop.com/',
        listingUrl: 'https://www.depop.com/products/create/',
        color: '#000000',
    },
    {
        id: 'wallapop',
        name: 'Wallapop',
        loginUrl: 'https://es.wallapop.com/',
        listingUrl: 'https://es.wallapop.com/item/new',
        color: '#13C1AC',
    },
];

const STORAGE_KEY = '@selly_marketplace_connections';
const PENDING_LOGIN_KEY = '@selly_pending_login';

export class AuthService {
    /**
     * Get login URL for a marketplace
     */
    static getLoginUrl(marketplaceId: string): string | null {
        const marketplace = MARKETPLACES.find(m => m.id === marketplaceId);
        return marketplace?.loginUrl || null;
    }

    /**
     * Mark login as pending (for tracking in browser)
     */
    static async setPendingLogin(marketplaceId: string): Promise<void> {
        try {
            await AsyncStorage.setItem(PENDING_LOGIN_KEY, marketplaceId);
        } catch (error) {
            console.error('Error setting pending login:', error);
        }
    }

    /**
     * Get pending login marketplace
     */
    static async getPendingLogin(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(PENDING_LOGIN_KEY);
        } catch {
            return null;
        }
    }

    /**
     * Clear pending login
     */
    static async clearPendingLogin(): Promise<void> {
        try {
            await AsyncStorage.removeItem(PENDING_LOGIN_KEY);
        } catch (error) {
            console.error('Error clearing pending login:', error);
        }
    }

    /**
     * Check if a marketplace is connected
     */
    static async isConnected(marketplaceId: string): Promise<boolean> {
        try {
            const connections = await this.getConnections();
            return connections.includes(marketplaceId);
        } catch {
            return false;
        }
    }

    /**
     * Get all connected marketplaces
     */
    static async getConnections(): Promise<string[]> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    /**
     * Mark a marketplace as connected
     */
    static async markAsConnected(marketplaceId: string): Promise<void> {
        try {
            const connections = await this.getConnections();
            if (!connections.includes(marketplaceId)) {
                connections.push(marketplaceId);
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
            }
        } catch (error) {
            console.error('Error saving connection:', error);
        }
    }

    /**
     * Disconnect a marketplace
     */
    static async disconnect(marketplaceId: string): Promise<void> {
        try {
            const connections = await this.getConnections();
            const filtered = connections.filter(id => id !== marketplaceId);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        } catch (error) {
            console.error('Error disconnecting:', error);
        }
    }

    /**
     * Get marketplace config by ID
     */
    static getMarketplace(marketplaceId: string): MarketplaceConfig | undefined {
        return MARKETPLACES.find(m => m.id === marketplaceId);
    }
}
