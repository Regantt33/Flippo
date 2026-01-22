import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SelectorConfig {
    main: string;
    backup?: string;
    type: string;
}

export interface MarketplaceConfig {
    marketplace: string;
    selectors: { [key: string]: SelectorConfig };
}

const CONFIG_URL = 'https://gist.githubusercontent.com/thesellyapp/fa467c6482d0927f0ef385c58ab93e90/raw/3f103eae6b6a3f1ba83123adb0592195c60a479c/gistfile1.txt';
const STORAGE_KEY = 'selly_remote_config';

export const ConfigService = {
    /**
     * Fetches the latest configuration from the remote URL.
     * Caches it in AsyncStorage for offline use.
     * Returns the config object.
     */
    fetchConfig: async (): Promise<MarketplaceConfig | null> => {
        try {
            console.log('Fetching remote config from:', CONFIG_URL);
            const response = await fetch(CONFIG_URL, { cache: 'no-cache' });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            const json = JSON.parse(text);

            // Basic validation
            if (!json || !json.marketplace || !json.selectors) {
                throw new Error('Invalid config structure');
            }

            console.log('Remote config fetched successfully');
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(json));
            return json;

        } catch (error) {
            console.error('Error fetching remote config:', error);

            // Fallback to cached config
            try {
                const cached = await AsyncStorage.getItem(STORAGE_KEY);
                if (cached) {
                    console.log('Using cached config');
                    return JSON.parse(cached);
                }
            } catch (storageError) {
                console.error('Error reading cached config:', storageError);
            }

            return null;
        }
    },

    /**
     * Returns the cached configuration synchronously (if loaded in memory)
     * or reads from storage. 
     * For now, we rely on fetchConfig being called at startup.
     */
    getConfig: async (): Promise<MarketplaceConfig | null> => {
        try {
            const cached = await AsyncStorage.getItem(STORAGE_KEY);
            return cached ? JSON.parse(cached) : null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Helper to get selectors for a specific marketplace URL.
     * Logic: Identify marketplace from URL -> Match with loaded config.
     * Note: The current JSON structure seems to support only ONE marketplace at top level ("marketplace": "vinted").
     * If the JSON grows to support multiple, this logic needs adaptation (e.g. array of configs).
     */
    getSelectorsForUrl: async (url: string): Promise<{ [key: string]: SelectorConfig } | null> => {
        const config = await ConfigService.getConfig();
        if (!config) return null;

        const lowerUrl = url.toLowerCase();

        // Check if the config matches the URL
        if (lowerUrl.includes(config.marketplace)) {
            return config.selectors;
        }

        return null;
    }
};
