import { MarketplaceLogo } from '@/components/MarketplaceLogo';
import { Colors } from '@/constants/Colors';
import { AuthService } from '@/services/AuthService';
import { MarketplaceConfig, SettingsService } from '@/services/settings';
import { InventoryItem, StorageService } from '@/services/storage';
import { SCRIPTS } from '@/utils/scripts';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PremiumButton = ({ onPress, children, style, disabled }: any) => {
    const scale = useRef(new Animated.Value(1)).current;
    const handlePressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
    const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

    return (
        <AnimatedPressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[style, { transform: [{ scale }] }]}
            disabled={disabled}
        >
            {children}
        </AnimatedPressable>
    );
};

export default function BrowserScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const webViewRef = useRef<WebView>(null);

    // State
    const [url, setUrl] = useState<string>('');
    const [marketplaces, setMarketplaces] = useState<MarketplaceConfig[]>([]);
    const [connectedMarketplaces, setConnectedMarketplaces] = useState<string[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [currentSite, setCurrentSite] = useState<string | null>(null);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [canGoBack, setCanGoBack] = useState(false);
    const [showInventorySheet, setShowInventorySheet] = useState(false);

    // Automation State
    const [isCompiling, setIsCompiling] = useState(false);
    const [compileProgress, setCompileProgress] = useState(0);

    const navigation = useNavigation();
    const isFromOnboarding = params.source === 'onboarding';

    useLayoutEffect(() => {
        if (isFromOnboarding && url) {
            navigation.setOptions({
                tabBarStyle: { display: 'none' },
            });
        } else {
            navigation.setOptions({
                tabBarStyle: {
                    backgroundColor: '#FEFBF8',
                    borderTopColor: '#F2F2F7',
                },
            });
        }
    }, [navigation, isFromOnboarding, url]);

    useFocusEffect(useCallback(() => {
        const init = async () => {
            const mList = await loadMarketplaces();
            const connected = await AuthService.getConnections();
            const items = await StorageService.getItems();
            setConnectedMarketplaces(connected);
            setInventory(items);

            if (params.url) {
                setUrl(params.url as string);
                extractSiteFromUrl(params.url as string);
            } else if (params.platform) {
                const found = mList.find(x => x.id === params.platform);
                if (found) {
                    setUrl(found.listingUrl || found.url);
                    setCurrentSite(found.id);
                }
            }

            if (params.itemId) {
                setSelectedItemId(params.itemId as string);
            }
        };
        init();
    }, [params.url, params.platform, params.itemId]));

    const loadMarketplaces = async () => {
        const m = await SettingsService.getMarketplaces();
        const enabled = m.filter(x => x.isEnabled);
        setMarketplaces(enabled);
        return enabled;
    };

    const extractSiteFromUrl = (url: string) => {
        if (url.includes('vinted')) setCurrentSite('vinted');
        else if (url.includes('ebay')) setCurrentSite('ebay');
        else if (url.includes('subito')) setCurrentSite('subito');
        else setCurrentSite(null);
    };

    const handleMarketSelection = (m: MarketplaceConfig) => {
        setUrl(m.listingUrl || m.url);
        setCurrentSite(m.id);
    };

    const handleLoginMode = async () => {
        if (!currentSite) return;
        const loginUrl = AuthService.getLoginUrl(currentSite);
        if (loginUrl) {
            await AuthService.setPendingLogin(currentSite);
            setUrl(loginUrl);
            console.log(`Switched to Login Mode for ${currentSite}`);
        }
    };

    const handleManualConnection = async () => {
        if (!currentSite) return;
        await AuthService.markAsConnected(currentSite);
        await AuthService.clearPendingLogin();
        const connected = await AuthService.getConnections();
        setConnectedMarketplaces(connected);

        if (params.source === 'onboarding') {
            router.replace('/onboarding?step=3');
        } else if (params.source === 'profile') {
            router.replace('/(tabs)/profile');
        }
    };

    const injectAutoCompile = async (itemId?: string) => {
        const id = itemId || selectedItemId;
        if (!id) return;

        setIsCompiling(true);
        setCompileProgress(0.1);

        const items = await StorageService.getItems();
        const item = items.find(i => i.id === id);

        if (item && webViewRef.current) {
            setCompileProgress(0.2);

            // Convert images to Base64 for WebView injection
            const b64Images = await Promise.all((item.images || []).map(async (uri) => {
                try {
                    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                    return `data:image/jpeg;base64,${base64}`;
                } catch (e) {
                    console.error('Error converting image to base64:', e);
                    return null;
                }
            }));

            const validImages = b64Images.filter(img => img !== null) as string[];
            const itemWithB64 = { ...item, images: validImages };

            setCompileProgress(0.4);
            const script = SCRIPTS.AUTO_COMPILE(itemWithB64);
            webViewRef.current.injectJavaScript(script);

            setTimeout(() => setCompileProgress(0.6), 800);
            setTimeout(() => setCompileProgress(0.9), 1500);

            setTimeout(() => {
                setCompileProgress(1);
                setTimeout(() => setIsCompiling(false), 500);
            }, 2200);
        }
    };

    const handleSelectItem = (id: string) => {
        setSelectedItemId(id);
        setShowInventorySheet(false);
        // Briefly wait for sheet to close then trigger autocompile if logic allows
    };

    useEffect(() => {
        if (params.autoFillMode === 'true' && url && !isLoading && selectedItemId) {
            const timer = setTimeout(() => injectAutoCompile(), 2000);
            return () => clearTimeout(timer);
        }
    }, [url, isLoading, selectedItemId]);

    const isConnected = currentSite ? connectedMarketplaces.includes(currentSite) : true;

    // Marketplace Grid View
    if (!url) {
        return (
            <View style={styles.container}>
                <View style={styles.hubHeader}>
                    <Text style={styles.hubTitle}>Selly Hub</Text>
                    <Text style={styles.hubSubtitle}>Gestione annunci diretta</Text>
                </View>

                <ScrollView contentContainerStyle={styles.hubGrid} showsVerticalScrollIndicator={false}>
                    {marketplaces.length === 0 ? (
                        <View style={styles.emptyHub}>
                            <FontAwesome name="plug" size={40} color="#F2F2F7" />
                            <Text style={styles.emptyText}>Nessun marketplace attivo.</Text>
                            <PremiumButton style={styles.settingsBtn} onPress={() => router.push('/(tabs)/profile')}>
                                <Text style={styles.settingsBtnText}>Attiva Marketplace</Text>
                            </PremiumButton>
                        </View>
                    ) : (
                        marketplaces.map(m => {
                            const connected = connectedMarketplaces.includes(m.id);
                            return (
                                <PremiumButton
                                    key={m.id}
                                    style={[styles.marketCard, connected && { opacity: 0.8 }]}
                                    onPress={() => handleMarketSelection(m)}
                                >
                                    <MarketplaceLogo id={m.id} style={styles.marketLogo} />
                                    <View style={styles.marketInfo}>
                                        <Text style={styles.marketName}>{m.name}</Text>
                                        <View style={[styles.marketBadge, !connected && styles.marketBadgeError]}>
                                            <Text style={[styles.marketBadgeText, !connected && styles.marketBadgeTextError]}>
                                                {connected ? 'COLLEGATO' : 'DA COLLEGARE'}
                                            </Text>
                                        </View>
                                    </View>
                                    {!connected && <FontAwesome name="chevron-right" size={14} color="#C7C7CC" />}
                                    {connected && <FontAwesome name="check-circle" size={18} color="#34C759" />}
                                </PremiumButton>
                            );
                        })
                    )}
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Quick Switcher Bar / Onboarding Header */}
            <View style={styles.browserHeader}>
                {isFromOnboarding ? (
                    <View style={styles.onboardingHeader}>
                        <PremiumButton style={styles.backBtn} onPress={() => router.replace('/onboarding?step=3')}>
                            <FontAwesome name="chevron-left" size={14} color="#1C1C1E" />
                            <Text style={styles.backBtnText}>Torna alla lista</Text>
                        </PremiumButton>
                        <Text style={styles.onboardingTitle}>Login Marketplace</Text>
                        <View style={{ width: 80 }} />
                    </View>
                ) : (
                    <>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherScroll}>
                            <PremiumButton style={[styles.switchChip, !currentSite && styles.switchChipActive]} onPress={() => setUrl('')}>
                                <FontAwesome name="th-large" size={14} color={!currentSite ? "#fff" : "#8E8E93"} />
                            </PremiumButton>
                            {marketplaces.map(m => (
                                <PremiumButton
                                    key={m.id}
                                    style={[styles.switchChip, currentSite === m.id && styles.switchChipActive]}
                                    onPress={() => handleMarketSelection(m)}
                                >
                                    <Text style={[styles.switchText, currentSite === m.id && styles.switchTextActive]}>{m.name}</Text>
                                </PremiumButton>
                            ))}
                        </ScrollView>
                        <PremiumButton style={styles.refreshBtn} onPress={() => webViewRef.current?.reload()}>
                            <FontAwesome name="refresh" size={14} color="#C7C7CC" />
                        </PremiumButton>
                    </>
                )}
            </View>

            {/* Login Mode Banner */}
            {currentSite && !isConnected && !isLoading && (
                <View style={styles.loginBanner}>
                    <View style={styles.loginBannerContent}>
                        <View style={styles.loginBannerHeader}>
                            <FontAwesome name="info-circle" size={16} color="#8C5A00" />
                            <Text style={styles.loginBannerTitle}>Automation restricted</Text>
                        </View>
                        <Text style={styles.loginBannerSubtitle}>
                            Sign in to {marketplaces.find(m => m.id === currentSite)?.name || 'the marketplace'} to enable Selly tools. Once done, we'll detect it automatically.
                        </Text>
                    </View>
                    <View style={styles.loginBannerActions}>
                        <PremiumButton style={styles.loginBannerBtn} onPress={handleLoginMode}>
                            <Text style={styles.loginBtnText}>Go to Login</Text>
                        </PremiumButton>
                        <PremiumButton style={styles.manualConnectBtn} onPress={handleManualConnection}>
                            <Text style={styles.manualConnectBtnText}>Logged in?</Text>
                        </PremiumButton>
                    </View>
                </View>
            )}

            <WebView
                ref={webViewRef}
                source={{ uri: url }}
                style={styles.webview}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
                onNavigationStateChange={(navState) => {
                    setCanGoBack(navState.canGoBack);
                    extractSiteFromUrl(navState.url);

                    // Login Detection Logic
                    const checkLogin = async () => {
                        const pendingId = await AuthService.getPendingLogin();
                        if (pendingId) {
                            const url = navState.url.toLowerCase();
                            const isHome =
                                (pendingId === 'vinted' && (url.includes('vinted.it') && (url.endsWith('/') || url.includes('feed') || url.includes('member')))) ||
                                (pendingId === 'ebay' && (url.includes('ebay.it') && (url.includes('usr') || url.includes('myebay') || url.endsWith('.it/')))) ||
                                (pendingId === 'subito' && (url.includes('subito.it') && (url.includes('utente') || url.includes('area-riservata')))) ||
                                (pendingId === 'wallapop' && url.includes('wallapop.com') && url.includes('catalog')) ||
                                (pendingId === 'depop' && url.includes('depop.com') && url.includes('profile'));

                            if (isHome) {
                                await AuthService.markAsConnected(pendingId);
                                await AuthService.clearPendingLogin();
                                const connected = await AuthService.getConnections();
                                setConnectedMarketplaces(connected);

                                if (params.source === 'onboarding') {
                                    router.replace('/onboarding?step=3');
                                } else if (params.source === 'profile') {
                                    router.replace('/(tabs)/profile');
                                }
                            }
                        }
                    };
                    checkLogin();
                }}
                onMessage={(event) => {
                    try {
                        const data = JSON.parse(event.nativeEvent.data);
                        if (data.type === 'LOG') console.log('[WebView Log]', data.message);
                    } catch (e) { }
                }}
            />

            {/* Automation Progress HUD */}
            {isCompiling && (
                <View style={styles.overlay}>
                    <View style={styles.statusCard}>
                        <ActivityIndicator color={Colors.light.primary} />
                        <Text style={styles.statusText}>Inserimento Dati In Corso...</Text>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${compileProgress * 100}%` }]} />
                        </View>
                    </View>
                </View>
            )}

            {/* UI Actions Overlay */}
            <View style={styles.actionsOverlay}>
                {canGoBack && (
                    <PremiumButton style={styles.actionFab} onPress={() => webViewRef.current?.goBack()}>
                        <FontAwesome name="chevron-left" size={16} color="#fff" />
                    </PremiumButton>
                )}

                {/* AUTOCOMPILE BUTTON - Magic Sparkles */}
                {isConnected && !isFromOnboarding && (
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <PremiumButton style={[styles.actionFab, styles.secondaryFab]} onPress={() => setShowInventorySheet(true)}>
                            <FontAwesome name="list-ul" size={16} color="#fff" />
                        </PremiumButton>
                        <PremiumButton
                            style={[styles.actionFab, styles.compileFab, !selectedItemId && { backgroundColor: '#C7C7CC' }]}
                            onPress={() => selectedItemId ? injectAutoCompile() : setShowInventorySheet(true)}
                        >
                            <FontAwesome name="magic" size={20} color="#fff" />
                            <Text style={styles.compileFabText}>
                                {selectedItemId ? 'Compila' : 'Seleziona Oggetto'}
                            </Text>
                        </PremiumButton>
                    </View>
                )}
            </View>

            {/* Inventory Selection Modal */}
            <Modal visible={showInventorySheet} animationType="slide" transparent={true} onRequestClose={() => setShowInventorySheet(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.sheet}>
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Seleziona Oggetto</Text>
                            <PremiumButton style={styles.closeBtn} onPress={() => setShowInventorySheet(false)}>
                                <FontAwesome name="close" size={16} color="#8E8E93" />
                            </PremiumButton>
                        </View>
                        <ScrollView contentContainerStyle={styles.sheetContent}>
                            {inventory.length === 0 ? (
                                <Text style={styles.emptyText}>Inventario vuoto</Text>
                            ) : (
                                inventory.map(item => (
                                    <PremiumButton
                                        key={item.id}
                                        style={[styles.itemRow, selectedItemId === item.id && styles.itemRowActive]}
                                        onPress={() => handleSelectItem(item.id)}
                                    >
                                        <Image source={{ uri: item.images[0] }} style={styles.itemThumb} />
                                        <View style={styles.itemInfo}>
                                            <Text style={styles.itemName} numberOfLines={1}>{item.title}</Text>
                                            <Text style={styles.itemPrice}>€{item.price}</Text>
                                        </View>
                                        {selectedItemId === item.id && <FontAwesome name="check-circle" size={20} color={Colors.light.primary} />}
                                    </PremiumButton>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FEFBF8' },

    hubHeader: { paddingHorizontal: 24, paddingTop: 60, marginBottom: 32 },
    hubTitle: { fontSize: 32, fontWeight: '900', color: '#1C1C1E', letterSpacing: -1 },
    hubSubtitle: { fontSize: 15, color: '#8E8E93', fontWeight: '500', marginTop: 4 },
    hubGrid: { paddingHorizontal: 24, gap: 16, paddingBottom: 100 },
    marketCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', padding: 20, borderRadius: 24 },
    marketLogo: { width: 48, height: 48, borderRadius: 8 },
    marketInfo: { flex: 1, marginLeft: 16 },
    marketName: { fontSize: 17, fontWeight: '800', color: '#1C1C1E' },
    marketBadge: { backgroundColor: '#34C75915', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 4 },
    marketBadgeText: { fontSize: 10, fontWeight: '900', color: '#34C759', letterSpacing: 0.5 },
    marketBadgeError: { backgroundColor: '#FF950015' },
    marketBadgeTextError: { color: '#FF9500' },
    emptyHub: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
    emptyText: { fontSize: 14, color: '#8E8E93', marginTop: 16, fontWeight: '600', textAlign: 'center' },
    settingsBtn: { marginTop: 24, backgroundColor: '#1C1C1E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
    settingsBtnText: { color: '#fff', fontWeight: '800' },

    browserHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, backgroundColor: '#FEFBF8', borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
    switcherScroll: { gap: 8, paddingRight: 40 },
    switchChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F8F9FB', minWidth: 40, alignItems: 'center', justifyContent: 'center' },
    switchChipActive: { backgroundColor: '#1C1C1E' },
    switchText: { fontSize: 13, fontWeight: '800', color: '#8E8E93' },
    switchTextActive: { color: '#FFFFFF' },
    refreshBtn: { width: 40, height: 40, marginLeft: 8, justifyContent: 'center', alignItems: 'center' },

    loginBanner: {
        backgroundColor: '#FFF9F2',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#FF950020',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    loginBannerContent: { flex: 1, marginRight: 12 },
    loginBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    loginBannerTitle: { fontSize: 13, fontWeight: '900', color: '#8C5A00', textTransform: 'uppercase', letterSpacing: 0.5 },
    loginBannerSubtitle: { fontSize: 13, color: '#8C5A00', fontWeight: '500', lineHeight: 18 },
    loginBannerActions: { flexDirection: 'row', gap: 8 },
    loginBannerBtn: { backgroundColor: '#FF9500', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    loginBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    manualConnectBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FF9500', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    manualConnectBtnText: { color: '#FF9500', fontSize: 12, fontWeight: '800' },

    webview: { flex: 1 },

    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 101 },
    statusCard: { backgroundColor: '#FEFBF8', padding: 32, borderRadius: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 10 },
    statusText: { fontSize: 17, fontWeight: '900', color: '#1C1C1E', marginTop: 20, marginBottom: 16 },
    progressBar: { width: 220, height: 8, backgroundColor: '#F2F2F7', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: Colors.light.primary },

    actionsOverlay: { position: 'absolute', bottom: 32, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 },
    actionFab: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1C1C1E', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
    secondaryFab: { backgroundColor: '#1C1C1E' },
    compileFab: { flexDirection: 'row', width: 'auto', paddingHorizontal: 24, backgroundColor: '#34C759' },
    compileFabText: { color: '#fff', fontSize: 16, fontWeight: '800', marginLeft: 10 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '80%', paddingBottom: 40 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
    sheetTitle: { fontSize: 20, fontWeight: '900', color: '#1C1C1E' },
    closeBtn: { padding: 8 },
    sheetContent: { padding: 24, gap: 16 },
    itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', padding: 12, borderRadius: 20 },
    itemRowActive: { borderWidth: 2, borderColor: Colors.light.primary },
    itemThumb: { width: 60, height: 60, borderRadius: 12, marginRight: 16 },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
    itemPrice: { fontSize: 14, color: '#8E8E93', fontWeight: '600', marginTop: 2 },

    onboardingHeader: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8 },
    backBtnText: { fontSize: 13, fontWeight: '700', color: '#1C1C1E' },
    onboardingTitle: { fontSize: 15, fontWeight: '800', color: '#1C1C1E' },
});
