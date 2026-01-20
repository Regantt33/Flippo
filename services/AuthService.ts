import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';

// Marketplace configuration
export interface MarketplaceConfig {
    id: string;
    name: string;
    loginUrl: string;
    color: string;
}

export const MARKETPLACES: MarketplaceConfig[] = [
    {
        id: 'vinted',
        name: 'Vinted',
        loginUrl: 'https://www.vinted.it/member/general/login',
        color: '#09B1BA',
    },
    {
        id: 'ebay',
        name: 'eBay',
        loginUrl: 'https://signin.ebay.it/ws/eBayISAPI.dll',
        color: '#E53238',
    },
    {
        id: 'subito',
        name: 'Subito',
        loginUrl: 'https://login.subito.it/',
        color: '#FF5F5F',
    },
    {
        id: 'depop',
        name: 'Depop',
        loginUrl: 'https://www.depop.com/login/',
        color: '#000000',
    },
    {
        id: 'wallapop',
        name: 'Wallapop',
        loginUrl: 'https://es.wallapop.com/app/login',
        color: '#13C1AC',
    },
];

const STORAGE_KEY = 'marketplace_connections';

export class AuthService {
    /**
     * Open native browser for marketplace login
     */
    static async openLogin(marketplaceId: string): Promise<boolean> {
        const marketplace = MARKETPLACES.find(m => m.id === marketplaceId);
        if (!marketplace) {
            Alert.alert('Error', 'Marketplace not found');
            return false;
        }

        try {
            // Open native browser (Safari/Chrome Custom Tabs)
            const result = await WebBrowser.openAuthSessionAsync(
                marketplace.loginUrl,
                undefined,
                {
                    showInRecents: true,
                }
            );

            if (result.type === 'success') {
                // Mark as connected
                await this.markAsConnected(marketplaceId);

                Alert.alert(
                    '✅ Login Completed',
                    `You've successfully logged into ${marketplace.name}. The session is now active.`,
                    [{ text: 'OK' }]
                );
                return true;
            } else if (result.type === 'cancel') {
                Alert.alert(
                    'Login Cancelled',
                    `You can connect ${marketplace.name} later from the Profile tab.`,
                    [{ text: 'OK' }]
                );
                return false;
            }
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert(
                'Login Error',
                'There was an error opening the login page. Please try again.',
                [{ text: 'OK' }]
            );
            return false;
        }

        return false;
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
