import { Colors } from '@/constants/Colors';
import { AuthService } from '@/services/AuthService';
import { StorageService } from '@/services/storage';
import { SCRIPTS } from '@/utils/scripts';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import WebView from 'react-native-webview';

export default function BrowserScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const [currentTab, setCurrentTab] = useState<'vinted' | 'ebay' | 'subito'>('vinted');
    const [isLoginMode, setIsLoginMode] = useState(false);
    const [pendingMarketplace, setPendingMarketplace] = useState<string | null>(null);
    const [loginDetected, setLoginDetected] = useState(false);

    // URL configurations
    const urls = {
        vinted: { home: 'https://www.vinted.it', sell: 'https://www.vinted.it/items/new' },
        ebay: { home: 'https://www.ebay.it', sell: 'https://www.ebay.it/sl/prelist/suggest' },
        subito: { home: 'https://www.subito.it', sell: 'https://www.subito.it/ai/form/0' }
    };

    // Determine initial URL based on params
    const [currentUrl, setCurrentUrl] = useState(urls.vinted.home);

    const webViewRef = useRef<WebView>(null);

    useEffect(() => {
        // Check for login mode from params
        if (params.login === 'true' && params.url) {
            setIsLoginMode(true);
            setCurrentUrl(decodeURIComponent(params.url as string));
        } else if (params.platform && params.autoFillMode === 'true') {
            const platform = params.platform as keyof typeof urls;
            setCurrentTab(platform);
            setCurrentUrl(urls[platform].sell);
        }

        // Check for pending login
        checkPendingLogin();
    }, [params]);

    const checkPendingLogin = async () => {
        const pending = await AuthService.getPendingLogin();
        if (pending) {
            setPendingMarketplace(pending);
            setIsLoginMode(true);
        }
    };

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'LOG') console.log("WebView Log:", data.message);
        } catch (e) { }
    };

    const injectAutoCompile = async () => {
        let item: any = {
            title: "Nike Air Jordan 1",
            price: "100",
            description: "Descrizione di prova"
        };

        if (params.itemId) {
            const stored = await StorageService.getItems();
            const found = stored.find(i => i.id === params.itemId);
            if (found) item = found;
        } else if (params.title) {
            item = {
                title: params.title as string,
                price: params.price as string,
                description: params.description as string
            };
        }

        webViewRef.current?.injectJavaScript(SCRIPTS.AUTO_COMPILE(item));
    };

    // Detect if login is complete based on URL
    const detectLoginComplete = (url: string): boolean => {
        if (!pendingMarketplace) return false;

        const lowerUrl = url.toLowerCase();

        // Vinted: if we're on catalog/feed/profile pages = logged in
        if (pendingMarketplace === 'vinted') {
            return lowerUrl.includes('vinted.it') &&
                (lowerUrl.includes('/catalog') || lowerUrl.includes('/member') || lowerUrl.includes('/items'));
        }

        // eBay: if we're past signin page = logged in
        if (pendingMarketplace === 'ebay') {
            return lowerUrl.includes('ebay.it') && !lowerUrl.includes('/signin') && !lowerUrl.includes('/ws/ebayisapi');
        }

        // Subito: if we're on main site without login page = logged in
        if (pendingMarketplace === 'subito') {
            return lowerUrl.includes('subito.it') && !lowerUrl.includes('/login');
        }

        return false;
    };

    // Handle successful login
    const handleLoginSuccess = async () => {
        if (!pendingMarketplace) return;

        await AuthService.markAsConnected(pendingMarketplace);
        await AuthService.clearPendingLogin();

        const marketplace = AuthService.getMarketplace(pendingMarketplace);

        Alert.alert(
            '✅ Login Completed!',
            `You're now logged into ${marketplace?.name || pendingMarketplace}. You can continue browsing or return to the app.`,
            [
                { text: 'Continue Browsing', style: 'cancel' },
                { text: 'Return to App', onPress: () => router.back() }
            ]
        );

        setLoginDetected(true);
        setIsLoginMode(false);
        setPendingMarketplace(null);
    };

    // Manual confirmation of login
    const handleManualConfirm = () => {
        Alert.alert(
            'Confirm Login',
            'Have you successfully logged in to the marketplace?',
            [
                { text: 'Not Yet', style: 'cancel' },
                { text: 'Yes, I\'m Logged In', onPress: handleLoginSuccess }
            ]
        );
    };

    // Handle navigation state change (auto-detection)
    const handleNavigationStateChange = (navState: any) => {
        if (isLoginMode && detectLoginComplete(navState.url)) {
            handleLoginSuccess();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                {/* Fake Browser Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, currentTab === 'vinted' && styles.activeTab]}
                        onPress={() => { setCurrentTab('vinted'); setCurrentUrl(urls.vinted.home); }}
                    >
                        <FontAwesome name="shopping-bag" size={14} color={currentTab === 'vinted' ? Colors.light.success : '#8E8E93'} />
                        <Text style={[styles.tabText, currentTab === 'vinted' && styles.activeTabText]}>Vinted</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, currentTab === 'ebay' && styles.activeTab]}
                        onPress={() => { setCurrentTab('ebay'); setCurrentUrl(urls.ebay.home); }}
                    >
                        <FontAwesome name="gavel" size={14} color={currentTab === 'ebay' ? Colors.light.secondary : '#8E8E93'} />
                        <Text style={[styles.tabText, currentTab === 'ebay' && styles.activeTabText]}>eBay</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, currentTab === 'subito' && styles.activeTab]}
                        onPress={() => { setCurrentTab('subito'); setCurrentUrl(urls.subito.home); }}
                    >
                        <FontAwesome name="bell" size={14} color={currentTab === 'subito' ? '#FF3B30' : '#8E8E93'} />
                        <Text style={[styles.tabText, currentTab === 'subito' && styles.activeTabText]}>Subito</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            <WebView
                ref={webViewRef}
                source={{ uri: currentUrl }}
                style={{ flex: 1 }}
                userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                onMessage={handleMessage}
                onNavigationStateChange={handleNavigationStateChange}
                injectedJavaScriptBeforeContentLoaded={SCRIPTS.ANTI_BOT_SCRIPT}
                injectedJavaScript={SCRIPTS.SCRAPE_NOTIFICATIONS}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                sharedCookiesEnabled={true}
                thirdPartyCookiesEnabled={true}
                setSupportMultipleWindows={false}
                startInLoadingState
                renderLoading={() => (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text>Loading...</Text>
                    </View>
                )}
            />

            {/* Login Mode Banner */}
            {isLoginMode && pendingMarketplace && (
                <View style={styles.loginBanner}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.loginBannerTitle}>🔐 Login Mode</Text>
                        <Text style={styles.loginBannerText}>
                            Log in to {AuthService.getMarketplace(pendingMarketplace)?.name || pendingMarketplace}.
                            I'll detect when you're done, or tap "Done" below.
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.loginConfirmBtn}
                        onPress={handleManualConfirm}
                    >
                        <Text style={styles.loginConfirmText}>✓ I'm Logged In</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.floatingBar}>
                <TouchableOpacity style={styles.turbofillBtn} onPress={injectAutoCompile}>
                    <FontAwesome name="magic" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.turbofillText}>Auto-Compile</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        height: 50,
        backgroundColor: '#F2F2F7',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    tabsContainer: {
        paddingHorizontal: 10,
        alignItems: 'center',
        gap: 8,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: 'transparent',
        marginRight: 4,
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        color: '#8E8E93',
        fontWeight: '500',
        fontSize: 13,
    },
    activeTabText: {
        color: '#000',
        fontWeight: '600',
    },
    webview: {
        flex: 1,
    },
    floatingBar: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
    },
    turbofillBtn: {
        flexDirection: 'row',
        backgroundColor: Colors.light.primary,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        alignItems: 'center',
    },
    turbofillText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    loginBanner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFF9E6',
        borderBottomWidth: 2,
        borderBottomColor: '#FFD700',
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    loginBannerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
        marginBottom: 4,
    },
    loginBannerText: {
        fontSize: 12,
        color: '#666',
        lineHeight: 16,
    },
    loginConfirmBtn: {
        backgroundColor: '#34C759',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    loginConfirmText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
});
