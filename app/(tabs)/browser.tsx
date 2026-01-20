import { Colors } from '@/constants/Colors';
import { AuthService } from '@/services/AuthService';
import { InventoryItem, StorageService } from '@/services/storage';
import { SCRIPTS } from '@/utils/scripts';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

    // Inventory selection state
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [showItemPicker, setShowItemPicker] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // URL configurations
    const urls = {
        vinted: { home: 'https://www.vinted.it', sell: 'https://www.vinted.it/items/new' },
        ebay: { home: 'https://www.ebay.it', sell: 'https://www.ebay.it/sl/prelist/suggest' },
        subito: { home: 'https://www.subito.it', sell: 'https://www.subito.it/ai/form/0' }
    };

    // Determine initial URL based on params
    const [currentUrl, setCurrentUrl] = useState(urls.vinted.sell);

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

    const injectAutoCompile = async (selectedItem?: InventoryItem) => {
        let item: any = null;

        if (selectedItem) {
            item = selectedItem;
        } else if (params.itemId) {
            const stored = await StorageService.getItems();
            const found = stored.find(i => i.id === params.itemId);
            if (found) item = found;
        } else if (params.title) {
            item = {
                title: params.title as string,
                price: params.price as string,
                description: params.description as string,
                images: []
            };
        }

        if (!item) {
            // No item selected, show picker
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
                // Prepare images: read local URIs as Base64 for WebView injection
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
                    images: base64Images.slice(0, 5) // Limit to 5 images to prevent bridge crashes
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
                        onPress={() => { setCurrentTab('vinted'); setCurrentUrl(urls.vinted.sell); }}
                    >
                        <FontAwesome name="shopping-bag" size={14} color={currentTab === 'vinted' ? Colors.light.success : '#8E8E93'} />
                        <Text style={[styles.tabText, currentTab === 'vinted' && styles.activeTabText]}>Vinted</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, currentTab === 'ebay' && styles.activeTab]}
                        onPress={() => { setCurrentTab('ebay'); setCurrentUrl(urls.ebay.sell); }}
                    >
                        <FontAwesome name="gavel" size={14} color={currentTab === 'ebay' ? Colors.light.secondary : '#8E8E93'} />
                        <Text style={[styles.tabText, currentTab === 'ebay' && styles.activeTabText]}>eBay</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, currentTab === 'subito' && styles.activeTab]}
                        onPress={() => { setCurrentTab('subito'); setCurrentUrl(urls.subito.sell); }}
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

            {/* Item Selection Modal */}
            <Modal
                visible={showItemPicker}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowItemPicker(false)}
            >
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
                                <TouchableOpacity
                                    style={styles.itemCard}
                                    onPress={() => injectAutoCompile(item)}
                                >
                                    <View style={styles.itemThumbnailContainer}>
                                        {item.images && item.images.length > 0 && item.images[0] ? (
                                            <Image
                                                source={{ uri: item.images[0] }}
                                                style={styles.itemThumbnail}
                                            />
                                        ) : (
                                            <FontAwesome name="image" size={20} color="#C7C7CC" />
                                        )}
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
                                    <TouchableOpacity
                                        style={styles.createBtn}
                                        onPress={() => { setShowItemPicker(false); router.push('/new-item'); }}
                                    >
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
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    sellShortcutBtn: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: Colors.light.primary,
    },
    sellShortcutText: {
        color: Colors.light.primary,
        fontWeight: '700',
        fontSize: 14,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    pickerContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '70%',
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
    },
    itemThumbnailContainer: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: '#E5E5EA',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    itemThumbnail: {
        width: '100%',
        height: '100%',
    },
    tabAction: {
        padding: 4,
        marginLeft: 4,
    },
    itemInfo: {
        flex: 1,
        marginLeft: 12,
    },
    itemTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
    },
    itemPrice: {
        fontSize: 13,
        color: Colors.light.success,
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        color: '#8E8E93',
        marginBottom: 16,
    },
    createBtn: {
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    createBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
});
