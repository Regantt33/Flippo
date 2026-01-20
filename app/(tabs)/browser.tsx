import { Colors } from '@/constants/Colors';
import { AuthService } from '@/services/AuthService';
import { StorageService } from '@/services/storage';
import { SCRIPTS } from '@/utils/scripts';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import WebView from 'react-native-webview';

export default function BrowserScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const navigation = useNavigation();
    const [currentTab, setCurrentTab] = useState<'vinted' | 'ebay' | 'subito'>('vinted');
    const [isLoginMode, setIsLoginMode] = useState(false);
    const [loginSource, setLoginSource] = useState<'onboarding' | 'profile' | 'publish' | null>(null);
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

    // Hide tab bar when in login mode
    useEffect(() => {
        navigation.setOptions({
            tabBarStyle: { display: isLoginMode ? 'none' : 'flex' }
        });
    }, [isLoginMode, navigation]);

    useEffect(() => {
        // Check for login mode from params
        if (params.login === 'true' && params.url) {
            setIsLoginMode(true);
            setLoginSource((params.source as any) || 'onboarding');
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

    // Detect if login is complete based on URL (improved precision)
    const detectLoginComplete = (url: string): boolean => {
        if (!pendingMarketplace) return false;

        const lowerUrl = url.toLowerCase();

        // Vinted: Multiple success indicators
        if (pendingMarketplace === 'vinted') {
            // Se siamo su queste pagine, l'user è loggato
            const successPages = ['/catalog', '/member/settings', '/items/', '/inbox', '/my/items'];
            const isSuccessPage = successPages.some(page => lowerUrl.includes(page));
            // Deve essere su vinted.it E su una pagina di successo E NON sulla pagina di login
            return lowerUrl.includes('vinted.it') && isSuccessPage && !lowerUrl.includes('/login') && !lowerUrl.includes('/auth');
        }

        // eBay: More precise detection
        if (pendingMarketplace === 'ebay') {
            // Se vediamo queste pagine = login ok
            const successPages = ['/myb/', '/mye/', '/sh/'];
            const isSuccessPage = successPages.some(page => lowerUrl.includes(page));
            return lowerUrl.includes('ebay.it') && (isSuccessPage || (!lowerUrl.includes('/signin') && !lowerUrl.includes('/ws/ebayisapi')));
        }

        // Subito: Better detection
        if (pendingMarketplace === 'subito') {
            // Pagine che indicano login
            const successIndicators = ['/mysubito', '/account', '/inserisci'];
            const hasSuccess = successIndicators.some(ind => lowerUrl.includes(ind));
            return lowerUrl.includes('subito.it') && (hasSuccess || !lowerUrl.includes('/login'));
        }

        return false;
    };

    // Handle successful login
    const handleLoginSuccess = async () => {
        if (!pendingMarketplace) return;

        await AuthService.markAsConnected(pendingMarketplace);
        await AuthService.clearPendingLogin();

        const marketplace = AuthService.getMarketplace(pendingMarketplace);

        // Determine where to return based on login source
        const returnButton = loginSource === 'onboarding'
            ? 'Back to Setup'
            : loginSource === 'profile'
                ? 'Back to Profile'
                : 'Continue';

        Alert.alert(
            '✅ Login Completed!',
            `You're now logged into ${marketplace?.name || pendingMarketplace}.`,
            [
                {
                    text: returnButton,
                    onPress: () => {
                        // Return to the source page
                        if (loginSource === 'onboarding') {
                            router.replace('/onboarding?step=2');
                        } else if (loginSource === 'profile') {
                            router.push('/(tabs)/profile');
                        } else {
                            router.back();
                        }
                    }
                }
            ]
        );

        setLoginDetected(true);
        setIsLoginMode(false);
        setPendingMarketplace(null);
        setLoginSource(null);
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

            {/* Login Mode Overlay - Subtle visual effect */}
            {isLoginMode && (
                <View style={styles.loginOverlay} pointerEvents="none" />
            )}

            {/* Login Mode Banner */}
            {isLoginMode && pendingMarketplace && (
                <View style={styles.loginBanner}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.loginBannerTitle}>🔐 Login Mode</Text>
                        <Text style={styles.loginBannerText}>
                            Log in to {AuthService.getMarketplace(pendingMarketplace)?.name || pendingMarketplace}.{' '}
                            I'll detect when you're done, or tap "Done" below.
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.loginConfirmBtn}
                        onPress={handleManualConfirm}
                    >
                        <FontAwesome name="check" size={18} color="#fff" />
                        <Text style={styles.loginConfirmText}>Done</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Floating Auto-Compile Button - Hidden in login mode */}
            {!isLoginMode && (
                <View style={styles.floatingBar}>
                    <TouchableOpacity style={styles.turbofillBtn} onPress={injectAutoCompile}>
                        <FontAwesome name="magic" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.turbofillText}>Auto-Compile</Text>
                    </TouchableOpacity>
                </View>
            )}
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
    loginOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 215, 0, 0.05)',
        pointerEvents: 'none',
    },
    loginBanner: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFF9E6',
        borderTopWidth: 3,
        borderTopColor: '#FFD700',
        paddingHorizontal: 20,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 8,
    },
    loginBannerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        marginBottom: 6,
    },
    loginBannerText: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    loginConfirmBtn: {
        backgroundColor: '#34C759',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
    loginConfirmText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
});
