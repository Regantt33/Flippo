
import { Text, View } from '@/components/Themed';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, SafeAreaView, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function LoadingSyncScreen() {
    const router = useRouter();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [syncStatus, setSyncStatus] = useState('Initializing Secure Core...');
    const [syncedCount, setSyncedCount] = useState(0);

    // Hidden WebViews refs
    const vintedRef = useRef<WebView>(null);
    const ebayRef = useRef<WebView>(null);

    useEffect(() => {
        // Animation in
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();

        // Simulation of Sync Process
        simulateSync();
    }, []);

    const simulateSync = async () => {
        // Step 1: Initialize Local Storage
        setSyncStatus('Loading Local Encrypted DB...');
        await new Promise(r => setTimeout(r, 1000));

        // Step 2: Inject Scripts into Hidden WebViews (simulated here)
        setSyncStatus('Establishing Peer-to-Peer connections...');
        // Real implementation would wait for onMessage from WebViews
        await new Promise(r => setTimeout(r, 1500));

        setSyncStatus('Syncing Vinted Messages...');
        await new Promise(r => setTimeout(r, 800));

        setSyncStatus('Syncing eBay Orders...');
        await new Promise(r => setTimeout(r, 800));

        setSyncStatus('Ready.');
        await new Promise(r => setTimeout(r, 500));

        // Navigate to Dashboard
        router.replace('/(tabs)');
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <Image
                    source={require('@/assets/images/selly-logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                {/* Text removed as requested, logo contains brand name */}

                <View style={styles.loaderContainer}>
                    <View style={styles.progressBar}>
                        <View style={styles.progressFill} />
                    </View>
                    <Text style={styles.statusText}>{syncStatus}</Text>
                </View>

                <View style={styles.securityBadge}>
                    <Text style={styles.securityText}>Running in Local-Only Mode</Text>
                </View>

                {/* HIDDEN WEBVIEWS FOR BACKGROUND SYNC */}
                {/* These would be 0x0 size but loaded to run scripts */}
                <View style={{ height: 0, width: 0, overflow: 'hidden' }}>
                    <WebView
                        ref={vintedRef}
                        source={{ uri: 'https://www.vinted.it' }}
                        onMessage={(e) => console.log('Vinted Sync:', e.nativeEvent.data)}
                    />
                    <WebView
                        ref={ebayRef}
                        source={{ uri: 'https://www.ebay.it' }}
                        onMessage={(e) => console.log('eBay Sync:', e.nativeEvent.data)}
                    />
                </View>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FEFBF8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        width: '100%',
    },
    logo: {
        width: 280, // Increased size
        height: 280,
        marginBottom: 40,
    },
    loaderContainer: {
        width: '70%',
        alignItems: 'center',
    },
    progressBar: {
        width: '100%',
        height: 6, // Slightly thicker
        backgroundColor: '#F2F2F7',
        borderRadius: 3,
        marginBottom: 15,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        width: '60%', // Static for demo, would be animated
        backgroundColor: Colors.light.primary,
    },
    statusText: {
        fontSize: 15,
        color: '#8E8E93',
        fontWeight: '500',
    },
    securityBadge: {
        position: 'absolute',
        bottom: -100, // Adjusted positioning
        padding: 10,
    },
    securityText: {
        fontSize: 13,
        color: '#D1D1D6',
    }
});
