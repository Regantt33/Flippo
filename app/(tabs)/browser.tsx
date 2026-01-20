import { Colors } from '@/constants/Colors';
import { AuthService } from '@/services/AuthService';
import { SettingsService } from '@/services/settings';
import { InventoryItem, StorageService } from '@/services/storage';
import { SCRIPTS } from '@/utils/scripts';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import WebView from 'react-native-webview';

export default function BrowserScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const navigation = useNavigation();
    const webViewRef = useRef<WebView>(null);

    // State for Dynamic Hub
    const [currentTab, setCurrentTab] = useState<string | null>(null);
    const [availableMarketplaces, setAvailableMarketplaces] = useState<any[]>([]);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [currentUrl, setCurrentUrl] = useState<string>('');

    // State for Login Mode
    const [isLoginMode, setIsLoginMode] = useState(false);
    const [loginSource, setLoginSource] = useState<'onboarding' | 'profile' | 'publish' | null>(null);
    const [pendingMarketplace, setPendingMarketplace] = useState<string | null>(null);
    const [loginDetected, setLoginDetected] = useState(false);

    // State for Auto-Fill
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [showItemPicker, setShowItemPicker] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Default URLs for marketplaces
    const urls = {
        vinted: { home: 'https://www.vinted.it', sell: 'https://www.vinted.it/items/new' },
        ebay: { home: 'https://www.ebay.it', sell: 'https://www.ebay.it/sl/prelist/suggest' },
        subito: { home: 'https://www.subito.it', sell: 'https://www.subito.it/pubblica-annuncio/' }
    };

    // 1. Initial Load: Filter Marketplaces
    useFocusEffect(
        useCallback(() => {
            loadMarketplaces();
        }, [])
    );

    const loadMarketplaces = async () => {
        try {
            const [all, connected] = await Promise.all([
                SettingsService.getMarketplaces(),
                AuthService.getConnections()
            ]);

            const filtered = all.filter(m => m.isEnabled && connected.includes(m.id));
            setAvailableMarketplaces(filtered);

            if (filtered.length > 0 && isInitialLoad) {
                const first = filtered[0];
                setCurrentTab(first.id);
                const targetUrl = first.id === 'vinted' ? urls.vinted.sell :
                    first.id === 'ebay' ? urls.ebay.sell :
                        first.id === 'subito' ? urls.subito.sell :
                            first.url;
                setCurrentUrl(targetUrl);
                setIsInitialLoad(false);
            }
        } catch (err) {
            console.error("Error loading marketplaces in Hub:", err);
        }
    };

    // 2. Navigation & Params Handling
    useEffect(() => {
        if (params.login === 'true' && params.url) {
            setIsLoginMode(true);
            setLoginSource((params.source as any) || 'onboarding');
            setCurrentUrl(decodeURIComponent(params.url as string));
        } else if (params.platform && params.autoFillMode === 'true') {
            const platform = params.platform as keyof typeof urls;
            if (urls[platform]) {
                setCurrentTab(platform);
                setCurrentUrl(urls[platform].sell);
            }
        }
        checkPendingLogin();
    }, [params]);

    const checkPendingLogin = async () => {
        const pending = await AuthService.getPendingLogin();
        if (pending) {
            setPendingMarketplace(pending);
            setIsLoginMode(true);
        }
    };

    // Hide tab bar in login mode
    useEffect(() => {
        navigation.setOptions({
            tabBarStyle: { display: isLoginMode ? 'none' : 'flex' }
        });
    }, [isLoginMode, navigation]);

    // 3. WebView Interactions
    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'LOG') console.log("WebView Log:", data.message);
        } catch (e) { }
    };

    const injectAutoCompile = async (selectedItem?: InventoryItem) => {
        let item: any = null;

        if (selectedItem) {
            item = selectedItem;
        } else if (params.itemId) {
            const stored = await StorageService.getItems();
            const found = stored.find(i => i.id === params.itemId);
            if (found) item = found;
        }

        if (!item) {
            const items = await StorageService.getItems();
            setInventoryItems(items);
            setShowItemPicker(true);
            return;
        }

        setIsProcessing(true);
        setShowItemPicker(false);

        // Wait for modal to close fully to avoid UI bridge congestion/crashes
        setTimeout(async () => {
            try {
                const base64Images = [];
                if (item.images && item.images.length > 0) {
                    for (const imgUri of item.images) {
                        try {
                            const base64 = await FileSystem.readAsStringAsync(imgUri, {
                                encoding: 'base64',
                            });
                            base64Images.push(`data:image/jpeg;base64,${base64}`);
                        } catch (err) {
                            console.error('Error reading image:', imgUri, err);
                        }
                    }
                }

                const compileData = {
                    title: item.title,
                    price: item.price,
                    description: item.description,
                    category: item.category,
                    images: base64Images.slice(0, 5)
                };

                webViewRef.current?.injectJavaScript(SCRIPTS.AUTO_COMPILE(compileData));
            } catch (error) {
                console.error('Auto-compile error:', error);
                Alert.alert('Error', 'Failed to prepare data for auto-fill.');
            } finally {
                setIsProcessing(false);
            }
        }, 300);
    };

    // 4. Login Detection Logic
    const detectLoginComplete = (url: string): boolean => {
        if (!pendingMarketplace) return false;
        const lowerUrl = url.toLowerCase();

        if (pendingMarketplace === 'vinted') {
            const successPages = ['/catalog', '/member/settings', '/items/', '/inbox', '/my/items'];
            return lowerUrl.includes('vinted.it') && successPages.some(pp => lowerUrl.includes(pp)) && !lowerUrl.includes('/login');
        }
        if (pendingMarketplace === 'ebay') {
            const successPages = ['/myb/', '/mye/', '/sh/'];
            return lowerUrl.includes('ebay.it') && (successPages.some(pp => lowerUrl.includes(pp)) || (!lowerUrl.includes('/signin') && !lowerUrl.includes('/ws/ebayisapi')));
        }
        if (pendingMarketplace === 'subito') {
            const successIndicators = ['/mysubito', '/account', '/inserisci'];
            return lowerUrl.includes('subito.it') && (successIndicators.some(pp => lowerUrl.includes(pp)) || !lowerUrl.includes('/login'));
        }
        return false;
    };

    const handleLoginSuccess = async () => {
        if (!pendingMarketplace) return;
        await AuthService.markAsConnected(pendingMarketplace);
        await AuthService.clearPendingLogin();

        const marketplace = AuthService.getMarketplace(pendingMarketplace);
        const returnButton = loginSource === 'onboarding' ? 'Back to Setup' : loginSource === 'profile' ? 'Back to Profile' : 'Continue';

        Alert.alert('✅ Login Completed!', `You're now logged into ${marketplace?.name || pendingMarketplace}.`, [
            {
                text: returnButton,
                onPress: () => {
                    if (loginSource === 'onboarding') router.replace('/onboarding?step=2');
                    else if (loginSource === 'profile') router.push('/(tabs)/profile');
                    else router.back();
                }
            }
        ]);

        setIsLoginMode(false);
        setPendingMarketplace(null);
    };

    const handleManualConfirm = () => {
        Alert.alert('Confirm Login', 'Have you successfully logged in?', [
            { text: 'Not Yet', style: 'cancel' },
            { text: 'Yes, I\'m Logged In', onPress: handleLoginSuccess }
        ]);
    };

    const handleNavigationStateChange = (navState: any) => {
        if (isLoginMode && detectLoginComplete(navState.url)) {
            handleLoginSuccess();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header / Tabs */}
            <View style={styles.header}>
                {availableMarketplaces.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
                        {availableMarketplaces.map((m) => {
                            const isActive = currentTab === m.id;
                            const sellUrl = m.id === 'vinted' ? urls.vinted.sell :
                                m.id === 'ebay' ? urls.ebay.sell :
                                    m.id === 'subito' ? urls.subito.sell : m.url;

                            return (
                                <TouchableOpacity
                                    key={m.id}
                                    style={[styles.tab, isActive && styles.activeTab]}
                                    onPress={() => {
                                        setCurrentTab(m.id);
                                        setCurrentUrl(sellUrl);
                                    }}
                                >
                                    <FontAwesome name={m.icon} size={14} color={isActive ? m.color : '#8E8E93'} />
                                    <Text style={[styles.tabText, isActive && styles.activeTabText]}>{m.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                ) : (
                    <View style={styles.emptyTabs}>
                        <Text style={styles.emptyTabText}>No connected marketplaces.</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                            <Text style={styles.connectLink}>Go to Profile to connect</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Main Content: WebView or Empty State */}
            {availableMarketplaces.length > 0 || isLoginMode ? (
                <WebView
                    key={currentTab || 'login'}
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
                    startInLoadingState
                    renderLoading={() => (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                            <Text style={{ color: '#8E8E93' }}>Loading Market...</Text>
                        </View>
                    )}
                />
            ) : (
                <View style={styles.emptyState}>
                    <FontAwesome name="plug" size={50} color="#C7C7CC" />
                    <Text style={styles.emptyStateTitle}>Marketplace Not Connected</Text>
                    <Text style={styles.emptyStateSub}>Connect your accounts in the Profile tab to enable the Smart Hub browser.</Text>
                    <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/(tabs)/profile')}>
                        <Text style={styles.profileBtnText}>Go to Profile</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Overlays */}
            {isLoginMode && <View style={styles.loginOverlay} pointerEvents="none" />}

            {isLoginMode && pendingMarketplace && (
                <View style={styles.loginBanner}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.loginBannerTitle}>🔐 Login Mode</Text>
                        <Text style={styles.loginBannerText}>
                            Log in to {AuthService.getMarketplace(pendingMarketplace)?.name || pendingMarketplace}.
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.loginConfirmBtn} onPress={handleManualConfirm}>
                        <FontAwesome name="check" size={18} color="#fff" />
                        <Text style={styles.loginConfirmText}>Done</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!isLoginMode && availableMarketplaces.length > 0 && (
                <View style={styles.floatingBar}>
                    <TouchableOpacity
                        style={[styles.turbofillBtn, isProcessing && { opacity: 0.7 }]}
                        onPress={() => injectAutoCompile()}
                        disabled={isProcessing}
                    >
                        <FontAwesome name={isProcessing ? "spinner" : "magic"} size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.turbofillText}>{isProcessing ? "Filling..." : "Auto-Fill"}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Item Picker Modal */}
            <Modal visible={showItemPicker} animationType="slide" transparent onRequestClose={() => setShowItemPicker(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Item to List</Text>
                            <TouchableOpacity onPress={() => setShowItemPicker(false)}>
                                <FontAwesome name="times" size={20} color="#8E8E93" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={inventoryItems}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.itemCard} onPress={() => injectAutoCompile(item)}>
                                    <View style={styles.itemThumbnailContainer}>
                                        {item.images?.[0] ? <Image source={{ uri: item.images[0] }} style={styles.itemThumbnail} /> : <FontAwesome name="image" size={20} color="#C7C7CC" />}
                                    </View>
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                                        <Text style={styles.itemPrice}>€{item.price}</Text>
                                    </View>
                                    <FontAwesome name="chevron-right" size={14} color="#C7C7CC" />
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={() => (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>No items found in inventory.</Text>
                                    <TouchableOpacity style={styles.createBtn} onPress={() => { setShowItemPicker(false); router.push('/new-item'); }}>
                                        <Text style={styles.createBtnText}>Create New Item</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            contentContainerStyle={{ padding: 16 }}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { height: 50, backgroundColor: '#F2F2F7', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
    tabsContainer: { paddingHorizontal: 10, alignItems: 'center' },
    tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginRight: 4 },
    activeTab: { backgroundColor: '#fff', elevation: 2, shadowOpacity: 0.1 },
    tabText: { color: '#8E8E93', fontWeight: '500', fontSize: 13 },
    activeTabText: { color: '#000', fontWeight: '600' },
    emptyTabs: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
    emptyTabText: { fontSize: 13, color: '#8E8E93' },
    connectLink: { fontSize: 13, color: Colors.light.primary, fontWeight: '600' },
    floatingBar: { position: 'absolute', bottom: 20, alignSelf: 'center' },
    turbofillBtn: { flexDirection: 'row', backgroundColor: Colors.light.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 30, elevation: 5 },
    turbofillText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    loginOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 215, 0, 0.05)' },
    loginBanner: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF9E6', borderTopWidth: 3, borderTopColor: '#FFD700', padding: 18, flexDirection: 'row', alignItems: 'center', elevation: 8 },
    loginBannerTitle: { fontSize: 16, fontWeight: '700' },
    loginBannerText: { fontSize: 13, color: '#666' },
    loginConfirmBtn: { backgroundColor: '#34C759', padding: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
    loginConfirmText: { color: '#fff', fontWeight: '700' },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyStateTitle: { fontSize: 20, fontWeight: '700', marginTop: 20 },
    emptyStateSub: { fontSize: 15, color: '#8E8E93', textAlign: 'center', marginTop: 10 },
    profileBtn: { marginTop: 30, backgroundColor: Colors.light.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
    profileBtnText: { color: '#fff', fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    pickerContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '70%' },
    pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
    pickerTitle: { fontSize: 18, fontWeight: '700' },
    itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA', padding: 12, borderRadius: 12, marginBottom: 12 },
    itemThumbnailContainer: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#E5E5EA', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    itemThumbnail: { width: '100%', height: '100%' },
    itemInfo: { flex: 1, marginLeft: 12 },
    itemTitle: { fontSize: 15, fontWeight: '600' },
    itemPrice: { fontSize: 13, color: Colors.light.success, marginTop: 2 },
    emptyContainer: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { color: '#8E8E93', marginBottom: 16 },
    createBtn: { backgroundColor: Colors.light.primary, padding: 10, borderRadius: 8 },
    createBtnText: { color: '#fff', fontWeight: '600' },
});
