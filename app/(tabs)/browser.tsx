import { Colors } from '@/constants/Colors';
import { StorageService } from '@/services/storage';
import { SCRIPTS } from '@/utils/scripts';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import WebView from 'react-native-webview';

export default function BrowserScreen() {
    const params = useLocalSearchParams();
    const [currentTab, setCurrentTab] = useState<'vinted' | 'ebay' | 'subito'>('vinted');

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
        if (params.platform && params.autoFillMode === 'true') {
            const platform = params.platform as keyof typeof urls;
            setCurrentTab(platform);
            setCurrentUrl(urls[platform].sell);
        }
    }, [params]);

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
                // Anti-detection: iPhone 14 / Safari Mobile (Standard, very trusted)
                userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                onMessage={handleMessage}
                // Run Anti-Bot script BEFORE content loads to mask webdriver
                injectedJavaScriptBeforeContentLoaded={SCRIPTS.ANTI_BOT_SCRIPT}
                // Scrape notifications after load
                injectedJavaScript={SCRIPTS.SCRAPE_NOTIFICATIONS}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                sharedCookiesEnabled={true}
                thirdPartyCookiesEnabled={true}
                setSupportMultipleWindows={false} // Prevents popup detections
                startInLoadingState
                renderLoading={() => (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text>Loading {currentTab}...</Text>
                    </View>
                )}
            />

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
    }
});
