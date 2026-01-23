import { MarketplaceLogo } from '@/components/MarketplaceLogo';
import { PremiumButton } from '@/components/PremiumButton';
import { SwipeWrapper } from '@/components/SwipeWrapper';
import { BorderRadius, Colors, Shadows } from '@/constants/Colors';
import { AuthService } from '@/services/AuthService';
import { MarketplaceConfig, SettingsService } from '@/services/settings';
import { InventoryItem, StorageService } from '@/services/storage';
import { SCRIPTS } from '@/utils/scripts';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

export default function BrowserScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const webViewRef = useRef<WebView>(null);
    const insets = useSafeAreaInsets();

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

    // REMOVED useLayoutEffect that was modifying tabBarStyle. 
    // This often causes layout loops/freezes.
    // We will handle specific styling later if needed.

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
                    const fileInfo = await FileSystem.getInfoAsync(uri);
                    if (!fileInfo.exists) {
                        console.warn(`Image file missing: ${uri}`);
                        return null;
                    }
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

            // Inject Smart AI Auto-Fill (Standard & Heuristic Fallback Included)
            console.log('Injecting Smart Auto-Fill System');
            const script = SCRIPTS.AUTO_FILL_SMART(itemWithB64);
            webViewRef.current.injectJavaScript(script);

            setTimeout(() => setCompileProgress(0.6), 800);
            setTimeout(() => setCompileProgress(0.9), 1500);

            setTimeout(() => {
                setCompileProgress(1);
                setTimeout(() => setIsCompiling(false), 2000); // 2s delay to show success animation
            }, 2200);
        }
    };

    const handleSelectItem = (id: string) => {
        setSelectedItemId(id);
        setShowInventorySheet(false);
        // Trigger compilation immediately after selection with a slight delay for modal close
        setTimeout(() => injectAutoCompile(id), 500);
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
            <SwipeWrapper leftRoute="/(tabs)/inventory" rightRoute="/(tabs)/profile">
                <View style={styles.container}>
                    {/* Decorative Background Elements */}
                    <View style={styles.bgDecoration1} />
                    <View style={styles.bgDecoration2} />

                    <View style={[styles.hubHeader, { paddingTop: Math.max(insets.top, 20) }]}>
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
                                        style={[styles.marketCard, currentSite === m.id ? styles.marketCardActive : {}]}
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
            </SwipeWrapper>
        );
    }

    return (
        <SwipeWrapper leftRoute="/(tabs)/inventory" rightRoute="/(tabs)/profile">
            <View style={styles.container}>
                {/* Quick Switcher Bar / Onboarding Header - COMPACT */}
                <View style={[styles.browserHeader, { paddingTop: Math.max(insets.top, 10) }]}>
                    {isFromOnboarding ? (
                        <View style={styles.onboardingHeader}>
                            <PremiumButton style={styles.backBtn} onPress={() => router.replace('/onboarding?step=3')}>
                                <FontAwesome name="chevron-left" size={16} color="#007AFF" />
                                <Text style={styles.backText}>Indietro</Text>
                            </PremiumButton>
                            <Text style={styles.onboardingTitle}>Collega {currentSite?.toUpperCase()}</Text>
                            <View style={{ width: 60 }} />
                        </View>
                    ) : (
                        <View style={styles.switcherScroll}>
                            <PremiumButton style={styles.homeBtn} onPress={() => {
                                setUrl('');
                                setCurrentSite(null);
                            }}>
                                <FontAwesome name="th-large" size={16} color="#1C1C1E" />
                            </PremiumButton>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
                                {marketplaces.map(m => (
                                    <PremiumButton
                                        key={m.id}
                                        style={[styles.switcherChip, currentSite === m.id ? styles.switcherChipActive : {}]}
                                        onPress={() => handleMarketSelection(m)}
                                    >
                                        <Text style={[styles.switcherText, currentSite === m.id && styles.switcherTextActive]}>
                                            {m.name}
                                        </Text>
                                    </PremiumButton>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>

                {/* Browser Control Bar - COMPACT */}
                <View style={styles.controlBar}>
                    <View style={[styles.statusIndicator, isConnected ? styles.statusConnected : styles.statusPending]}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>{isConnected ? 'Pronto' : 'Login richiesto'}</Text>
                    </View>

                    {!isConnected && (
                        <PremiumButton style={styles.loginAction} onPress={handleLoginMode}>
                            <Text style={styles.loginActionText}>Login</Text>
                        </PremiumButton>
                    )}
                </View>

                <WebView
                    ref={webViewRef}
                    key={currentSite || 'default'}
                    source={{ uri: url }}
                    style={styles.webview}
                    onLoadStart={() => setIsLoading(true)}
                    onLoadEnd={() => setIsLoading(false)}
                    onNavigationStateChange={(navState) => {
                        setCanGoBack(navState.canGoBack);
                        extractSiteFromUrl(navState.url);
                        // Login check kept but hidden for brevity in this replace block
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
                />

                {/* Automation Progress HUD */}
                {isCompiling && (
                    <View style={styles.compileHud}>
                        {compileProgress < 1 ? (
                            <>
                                <ActivityIndicator size="large" color="#FFFFFF" />
                                <Text style={styles.compileText}>Compilazione in corso...</Text>
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { width: `${compileProgress * 100}%` }]} />
                                </View>
                            </>
                        ) : (
                            <>
                                <FontAwesome name="check-circle" size={50} color="#34C759" style={{ marginBottom: 16 }} />
                                <Text style={styles.compileText}>Completato!</Text>
                            </>
                        )}
                    </View>
                )}

                {/* REFINED FLOATING ACTIONS */}
                <View style={styles.actionsOverlay}>
                    {canGoBack && (
                        <PremiumButton style={[styles.actionFab, styles.secondaryFab]} onPress={() => {
                            if (webViewRef.current) webViewRef.current.goBack();
                        }}>
                            <FontAwesome name="arrow-left" size={16} color="#FFF" />
                        </PremiumButton>
                    )}

                    {/* Spacer if no back button to keep Vendi Qui centered or right aligned */}
                    {!canGoBack && <View style={{ width: 44 }} />}

                    {currentSite && (
                        <PremiumButton style={styles.compileFab} onPress={() => setShowInventorySheet(true)}>
                            <FontAwesome name="magic" size={16} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.compileBtnText}>Vendi Qui</Text>
                        </PremiumButton>
                    )}

                    {/* Removed Manual Link Button as requested */}
                    <View style={{ width: 44 }} />
                </View>

                {/* INVENTORY SHEET MODAL */}
                <Modal
                    visible={showInventorySheet}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowInventorySheet(false)}
                >
                    <Pressable style={styles.modalOverlay} onPress={() => setShowInventorySheet(false)}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Scegli Articolo</Text>
                                <PremiumButton onPress={() => setShowInventorySheet(false)}>
                                    <FontAwesome name="close" size={24} color="#8E8E93" />
                                </PremiumButton>
                            </View>
                            <ScrollView contentContainerStyle={styles.inventoryList}>
                                {inventory.filter(i => i.status === 'Draft' || i.status === 'Active').map(item => (
                                    <PremiumButton key={item.id} style={styles.inventoryItem} onPress={() => handleSelectItem(item.id)}>
                                        <Image source={{ uri: item.images[0] }} style={styles.itemThumb} />
                                        <View style={styles.itemMeta}>
                                            <Text style={styles.itemName} numberOfLines={1}>{item.title}</Text>
                                            <Text style={styles.itemPrice}>€{item.price}</Text>
                                        </View>
                                        <FontAwesome name="chevron-right" size={14} color="#C7C7CC" />
                                    </PremiumButton>
                                ))}
                            </ScrollView>
                        </View>
                    </Pressable>
                </Modal>
            </View>
        </SwipeWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FEFBF8' },

    hubHeader: { paddingHorizontal: 24, marginBottom: 32 },
    hubTitle: { fontSize: 32, fontWeight: '900', color: Colors.light.text, letterSpacing: -1 },
    hubSubtitle: { fontSize: 16, color: Colors.light.icon, fontWeight: '500', marginTop: 4 },

    hubGrid: { paddingHorizontal: 24, paddingBottom: 40 },
    marketCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.surface,
        padding: 20,
        borderRadius: BorderRadius.xxl,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.light.surfaceHighlight,
        ...Shadows.md,
    },
    marketCardActive: {
        borderColor: Colors.light.accent,
        backgroundColor: Colors.light.accent + '05',
        ...Shadows.accent,
    },
    marketLogo: { width: 52, height: 52, borderRadius: 14, marginRight: 16 },
    marketInfo: { flex: 1 },
    marketName: { fontSize: 18, fontWeight: '800', color: Colors.light.text },
    marketBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: '#34C75915', marginTop: 6 },
    marketBadgeError: { backgroundColor: '#FF3B3015' },
    marketBadgeText: { fontSize: 10, fontWeight: '700', color: '#34C759', letterSpacing: 0.5 },
    marketBadgeTextError: { color: '#FF3B30' },

    emptyHub: { alignItems: 'center', marginTop: 60 },
    emptyText: { marginTop: 16, fontSize: 16, color: Colors.light.icon, fontWeight: '500', marginBottom: 24 },
    settingsBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
    settingsBtnText: { color: '#FFF', fontWeight: '700' },

    // Compact Browser Styles
    browserHeader: { backgroundColor: Colors.light.background, borderBottomWidth: 1, borderBottomColor: Colors.light.surfaceHighlight }, // Reduced top padding
    onboardingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
    backBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: Colors.light.surface, borderRadius: 12 },
    backText: { color: Colors.light.text, fontSize: 14, fontWeight: '700', marginLeft: 4 },
    onboardingTitle: { fontSize: 16, fontWeight: '800', color: Colors.light.text },

    switcherScroll: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8, alignItems: 'center' },
    homeBtn: { padding: 10, backgroundColor: Colors.light.surface, borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: Colors.light.surfaceHighlight },
    switcherChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: Colors.light.surface, borderWidth: 1, borderColor: Colors.light.surfaceHighlight },
    switcherChipActive: { backgroundColor: Colors.light.accent, borderColor: Colors.light.accent, ...Shadows.accent },
    switcherText: { fontSize: 13, fontWeight: '600', color: Colors.light.icon },
    switcherTextActive: { color: '#FFF' },

    controlBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.light.background, borderBottomWidth: 1, borderBottomColor: Colors.light.surfaceHighlight },
    statusIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#34C75915', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    statusPending: { backgroundColor: '#FF950015' },
    statusConnected: { backgroundColor: '#34C75915' },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34C759', marginRight: 6 },
    statusText: { fontSize: 11, fontWeight: '700', color: '#34C759' },
    loginAction: { backgroundColor: Colors.light.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
    loginActionText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

    webview: { flex: 1, backgroundColor: Colors.light.background },

    compileHud: { position: 'absolute', top: '40%', left: '15%', right: '15%', padding: 24, backgroundColor: 'rgba(28,28,30,0.95)', borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
    compileText: { marginTop: 16, color: '#FFF', fontSize: 15, fontWeight: '600', marginBottom: 16 },
    progressBar: { width: 180, height: 6, backgroundColor: '#3A3A3C', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#FFFFFF' }, // White progress on black HUD

    // Compact Actions
    actionsOverlay: { position: 'absolute', bottom: 80, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'box-none' },
    actionFab: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.light.primary, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
    secondaryFab: { backgroundColor: Colors.light.primary },
    compileFab: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        height: 48,
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.light.primary,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        marginHorizontal: 12,
        ...Shadows.lg,
    },
    compileBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: Colors.light.background,
        borderTopLeftRadius: BorderRadius.xxl,
        borderTopRightRadius: BorderRadius.xxl,
        height: '70%',
        ...Shadows.xl,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: Colors.light.surfaceHighlight },
    modalTitle: { fontSize: 20, fontWeight: '900', color: Colors.light.text },
    inventoryList: { padding: 20, paddingBottom: 60 },
    inventoryItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.surface, padding: 12, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.light.surfaceHighlight },
    itemThumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.light.background, marginRight: 16 },
    itemMeta: { flex: 1 },
    itemName: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
    itemPrice: { fontSize: 13, color: Colors.light.icon, fontWeight: '700' },
    bgDecoration1: {
        position: 'absolute',
        top: -40,
        right: -30,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(214, 109, 69, 0.03)',
        zIndex: -1,
    },
    bgDecoration2: {
        position: 'absolute',
        bottom: 100,
        left: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(214, 109, 69, 0.02)',
        zIndex: -1,
    },
});
