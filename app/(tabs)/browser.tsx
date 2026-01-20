import { MarketplaceLogo } from '@/components/MarketplaceLogo';
import { Colors } from '@/constants/Colors';
import { MarketplaceConfig, SettingsService } from '@/services/settings';
import { StorageService } from '@/services/storage';
import { AUTO_COMPILE } from '@/utils/scripts';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
    const [currentSite, setCurrentSite] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [canGoBack, setCanGoBack] = useState(false);

    // Automation State
    const [isCompiling, setIsCompiling] = useState(false);
    const [compileProgress, setCompileProgress] = useState(0);

    useFocusEffect(useCallback(() => {
        loadMarketplaces();
        if (params.url) {
            setUrl(params.url as string);
            extractSiteFromUrl(params.url as string);
        }
        if (params.platform) {
            const m = SettingsService.DEFAULT_MARKETPLACES.find(x => x.id === params.platform);
            if (m) {
                setUrl(m.url);
                setCurrentSite(m.id);
            }
        }
    }, [params.url, params.platform]));

    const loadMarketplaces = async () => {
        const m = await SettingsService.getMarketplaces();
        setMarketplaces(m.filter(x => x.isEnabled));
    };

    const extractSiteFromUrl = (url: string) => {
        if (url.includes('vinted')) setCurrentSite('vinted');
        else if (url.includes('ebay')) setCurrentSite('ebay');
        else if (url.includes('subito')) setCurrentSite('subito');
        else setCurrentSite(null);
    };

    const handleMarketSelection = (m: MarketplaceConfig) => {
        setUrl(m.url);
        setCurrentSite(m.id);
    };

    const injectAutoCompile = async () => {
        if (!params.itemId) return;
        setIsCompiling(true);
        setCompileProgress(0.1);

        const items = await StorageService.getItems();
        const item = items.find(i => i.id === params.itemId);

        if (item && webViewRef.current) {
            setCompileProgress(0.5);
            const script = AUTO_COMPILE(item);
            webViewRef.current.injectJavaScript(script);

            setTimeout(() => {
                setCompileProgress(1);
                setTimeout(() => setIsCompiling(false), 500);
            }, 2000);
        }
    };

    // Auto-trigger compile if mode is active
    useEffect(() => {
        if (params.autoFillMode === 'true' && url && !isLoading) {
            setTimeout(injectAutoCompile, 2000);
        }
    }, [url, isLoading]);

    if (!url) {
        return (
            <View style={styles.container}>
                <View style={styles.hubHeader}>
                    <Text style={styles.hubTitle}>Hub Automazioni</Text>
                    <Text style={styles.hubSubtitle}>Seleziona un marketplace per iniziare</Text>
                </View>

                <ScrollView contentContainerStyle={styles.hubGrid}>
                    {marketplaces.length === 0 ? (
                        <View style={styles.emptyHub}>
                            <FontAwesome name="plug" size={40} color="#F2F2F7" />
                            <Text style={styles.emptyText}>Nessun marketplace attivo.</Text>
                            <PremiumButton style={styles.settingsBtn} onPress={() => router.push('/(tabs)/profile')}>
                                <Text style={styles.settingsBtnText}>Configura Marketplace</Text>
                            </PremiumButton>
                        </View>
                    ) : (
                        marketplaces.map(m => (
                            <PremiumButton
                                key={m.id}
                                style={styles.marketCard}
                                onPress={() => handleMarketSelection(m)}
                            >
                                <MarketplaceLogo id={m.id} style={styles.marketLogo} />
                                <View style={styles.marketInfo}>
                                    <Text style={styles.marketName}>{m.name}</Text>
                                    <View style={styles.marketBadge}>
                                        <Text style={styles.marketBadgeText}>ONLINE</Text>
                                    </View>
                                </View>
                                <FontAwesome name="chevron-right" size={14} color="#C7C7CC" />
                            </PremiumButton>
                        ))
                    )}
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Minimal Browser Header */}
            <View style={styles.browserHeader}>
                <PremiumButton style={styles.navBtn} onPress={() => setUrl('')}>
                    <FontAwesome name="th-large" size={18} color="#1C1C1E" />
                </PremiumButton>

                <View style={styles.urlBar}>
                    {currentSite && <MarketplaceLogo id={currentSite} style={styles.smallLogo} />}
                    <Text style={styles.urlText} numberOfLines={1}>{url.replace('https://', '')}</Text>
                    {isLoading && <ActivityIndicator size="small" color={Colors.light.primary} />}
                </View>

                <View style={styles.browserActions}>
                    <PremiumButton style={styles.navBtn} onPress={() => webViewRef.current?.reload()}>
                        <FontAwesome name="refresh" size={16} color="#8E8E93" />
                    </PremiumButton>
                </View>
            </View>

            <WebView
                ref={webViewRef}
                source={{ uri: url }}
                style={styles.webview}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
                onNavigationStateChange={(navState) => {
                    setCanGoBack(navState.canGoBack);
                    extractSiteFromUrl(navState.url);
                }}
            />

            {/* Automation Overlay */}
            {isCompiling && (
                <View style={styles.overlay}>
                    <View style={styles.statusCard}>
                        <ActivityIndicator color={Colors.light.primary} />
                        <Text style={styles.statusText}>Compilazione Automatica...</Text>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${compileProgress * 100}%` }]} />
                        </View>
                    </View>
                </View>
            )}

            {/* Floating Navigation */}
            {canGoBack && (
                <PremiumButton style={styles.backFab} onPress={() => webViewRef.current?.goBack()}>
                    <FontAwesome name="chevron-left" size={16} color="#fff" />
                </PremiumButton>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },

    // Hub Styles
    hubHeader: { paddingHorizontal: 24, paddingTop: 60, marginBottom: 32 },
    hubTitle: { fontSize: 32, fontWeight: '900', color: '#1C1C1E', letterSpacing: -1 },
    hubSubtitle: { fontSize: 15, color: '#8E8E93', fontWeight: '500', marginTop: 4 },
    hubGrid: { paddingHorizontal: 24, gap: 16, paddingBottom: 100 },
    marketCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', padding: 20, borderRadius: 24 },
    marketLogo: { width: 90, height: 28 },
    marketInfo: { flex: 1, marginLeft: 16 },
    marketName: { fontSize: 17, fontWeight: '800', color: '#1C1C1E' },
    marketBadge: { backgroundColor: '#34C75920', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 },
    marketBadgeText: { fontSize: 9, fontWeight: '900', color: '#34C759' },
    emptyHub: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
    emptyText: { fontSize: 16, color: '#8E8E93', marginTop: 16, fontWeight: '600' },
    settingsBtn: { marginTop: 24, backgroundColor: '#1C1C1E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
    settingsBtnText: { color: '#fff', fontWeight: '800' },

    // Browser Styles
    browserHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F2F2F7', backgroundColor: '#FFFFFF' },
    navBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    urlBar: { flex: 1, height: 40, backgroundColor: '#F8F9FB', borderRadius: 12, marginHorizontal: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
    smallLogo: { width: 60, height: 18, marginRight: 8 },
    urlText: { flex: 1, fontSize: 13, color: '#8E8E93', fontWeight: '600' },
    browserActions: { flexDirection: 'row', alignItems: 'center' },
    webview: { flex: 1 },

    // Overlay & HUD
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    statusCard: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 10 },
    statusText: { fontSize: 16, fontWeight: '800', color: '#1C1C1E', marginTop: 16, marginBottom: 12 },
    progressBar: { width: 200, height: 6, backgroundColor: '#F2F2F7', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: Colors.light.primary },

    backFab: { position: 'absolute', bottom: 32, left: 24, width: 48, height: 48, borderRadius: 24, backgroundColor: '#1C1C1E', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15, zIndex: 100 },
});
