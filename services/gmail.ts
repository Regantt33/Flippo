
import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationType = 'sale' | 'message' | 'offer' | 'system';

export interface SellyNotification {
    id: string;
    platform: 'vinted' | 'ebay' | 'subito' | 'selly';
    type: NotificationType;
    title: string;
    body: string;
    timestamp: number;
    read: boolean;
    actionUrl?: string;
}

const NOTIFICATIONS_KEY = '@selly_notifications';

// Mock Data logic for simulation without real OAuth
const MOCK_EMAILS = [
    { sender: 'no-reply@vinted.it', subject: 'Hai venduto un articolo!', snippet: 'Congratulazioni, hai venduto Nike Air...', platform: 'vinted', type: 'sale' },
    { sender: 'ebay@ebay.it', subject: 'Offerta ricevuta', snippet: 'Un acquirente ha fatto un\'offerta per...', platform: 'ebay', type: 'offer' },
    { sender: 'no-reply@subito.it', subject: 'Nuovo messaggio', snippet: 'Ciao, è ancora disponibile?', platform: 'subito', type: 'message' },
];

export const GmailService = {
    // In a real app, this would use Google Sign-In token
    checkForNewEmails: async (): Promise<SellyNotification[]> => {
        // SIMULATION: Randomly generating notifications based on "Email Detection"
        const shouldFind = Math.random() > 0.5;
        if (!shouldFind) return [];

        const template = MOCK_EMAILS[Math.floor(Math.random() * MOCK_EMAILS.length)];

        const newNotif: SellyNotification = {
            id: Date.now().toString(),
            platform: template.platform as any,
            type: template.type as any,
            title: template.subject,
            body: template.snippet,
            timestamp: Date.now(),
            read: false,
            actionUrl: `https://${template.platform}.com`
        };

        await GmailService.addNotification(newNotif);
        return [newNotif];
    },

    getNotifications: async (): Promise<SellyNotification[]> => {
        const json = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
        return json ? JSON.parse(json) : [];
    },

    addNotification: async (notif: SellyNotification) => {
        const current = await GmailService.getNotifications();
        const updated = [notif, ...current];
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    },

    markAsRead: async (id: string) => {
        const current = await GmailService.getNotifications();
        const updated = current.map(n => n.id === id ? { ...n, read: true } : n);
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    },

    clearAll: async () => {
        await AsyncStorage.removeItem(NOTIFICATIONS_KEY);
    }
};
