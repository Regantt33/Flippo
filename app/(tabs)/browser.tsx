import { MarketplaceLogo } from '@/components/MarketplaceLogo';
import { Colors } from '@/constants/Colors';
import { AuthService } from '@/services/AuthService';
import { MarketplaceConfig, SettingsService } from '@/services/settings';
import { InventoryItem, StorageService } from '@/services/storage';
import { SCRIPTS } from '@/utils/scripts';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
            {/* Quick Switcher Bar / Onboarding Header - COMPACT */}
            <View style={styles.browserHeader}>
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
                                    style={[styles.switcherChip, currentSite === m.id && styles.switcherChipActive]}
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
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.compileText}>Compilazione in corso...</Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${compileProgress * 100}%` }]} />
                    </View>
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
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FEFBF8', paddingBottom: 50 }, // Reduced padding as TabBar is standard

    hubHeader: { paddingHorizontal: 24, paddingTop: 60, marginBottom: 32 },
    hubTitle: { fontSize: 32, fontWeight: '900', color: '#1C1C1E', letterSpacing: -1 },
    hubSubtitle: { fontSize: 16, color: '#8E8E93', fontWeight: '500', marginTop: 4 },

    hubGrid: { paddingHorizontal: 24, paddingBottom: 40 },
    marketCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#F2F2F7' },
    marketLogo: { width: 48, height: 48, borderRadius: 12, marginRight: 16 },
    marketInfo: { flex: 1 },
    marketName: { fontSize: 18, fontWeight: '800', color: '#1C1C1E' },
    marketBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#34C75920', marginTop: 4 },
    marketBadgeError: { backgroundColor: '#FF3B3020' },
    marketBadgeText: { fontSize: 10, fontWeight: '700', color: '#34C759' },
    marketBadgeTextError: { color: '#FF3B30' },

    emptyHub: { alignItems: 'center', marginTop: 60 },
    emptyText: { marginTop: 16, fontSize: 16, color: '#8E8E93', fontWeight: '500', marginBottom: 24 },
    settingsBtn: { backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
    settingsBtnText: { color: '#FFF', fontWeight: '700' },

    // Compact Browser Styles
    browserHeader: { backgroundColor: '#FEFBF8', borderBottomWidth: 1, borderBottomColor: '#F2F2F7', paddingTop: 40 }, // Reduced top padding
    onboardingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
    backBtn: { flexDirection: 'row', alignItems: 'center', padding: 8 },
    backText: { color: '#007AFF', fontSize: 16, fontWeight: '600', marginLeft: 4 },
    onboardingTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },

    switcherScroll: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 8, alignItems: 'center' },
    homeBtn: { padding: 8, backgroundColor: '#F2F2F7', borderRadius: 10, marginRight: 8 },
    switcherChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#F2F2F7' },
    switcherChipActive: { backgroundColor: '#1C1C1E' },
    switcherText: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
    switcherTextActive: { color: '#FFF' },

    controlBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
    statusIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#34C75915', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusPending: { backgroundColor: '#FF950015' },
    statusConnected: { backgroundColor: '#34C75915' },
    statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#34C759', marginRight: 5 },
    statusText: { fontSize: 11, fontWeight: '600', color: '#34C759' },
    loginAction: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
    loginActionText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

    webview: { flex: 1, backgroundColor: '#FEFBF8' },

    compileHud: { position: 'absolute', top: '40%', left: '15%', right: '15%', padding: 20, backgroundColor: 'rgba(28,28,30,0.95)', borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
    compileText: { marginTop: 12, color: '#FFF', fontSize: 14, fontWeight: '600', marginBottom: 12 },
    progressBar: { width: 180, height: 6, backgroundColor: '#F2F2F7', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: Colors.light.primary },

    // Compact Actions
    actionsOverlay: { position: 'absolute', bottom: 20, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 100, pointerEvents: 'box-none' },
    actionFab: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1C1C1E', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
    secondaryFab: { backgroundColor: '#1C1C1E' },
    compileFab: { flexDirection: 'row', paddingHorizontal: 20, height: 44, borderRadius: 22, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, flex: 1, marginHorizontal: 12 },
    compileBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FEFBF8', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '70%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1E' },
    inventoryList: { padding: 20, paddingBottom: 60 },
    inventoryItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 10, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#F2F2F7' },
    itemThumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F2F2F7', marginRight: 12 },
    itemMeta: { flex: 1 },
    itemName: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
    itemPrice: { fontSize: 13, color: '#007AFF', fontWeight: '600' }
});
