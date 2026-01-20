
import { Text, View } from '@/components/Themed';
import { Colors } from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

const { width } = Dimensions.get('window');

import { MarketplaceLogo } from '@/components/MarketplaceLogo';
import { AuthService, MARKETPLACES } from '@/services/AuthService';

export default function OnboardingScreen() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');

    // Animation Values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        // Reset and play animation on step change
        fadeAnim.setValue(0);
        slideAnim.setValue(20);
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true })
        ]).start();
    }, [step]);

    const handleNext = () => {
        if (step < 3) setStep(step + 1);
        else router.replace('/loading'); // Finish onboarding
    };

    // Navigate to browser for login
    const openLogin = async (marketplaceId: string) => {
        const url = AuthService.getLoginUrl(marketplaceId);
        if (url) {
            await AuthService.setPendingLogin(marketplaceId);
            router.push(`/(tabs)/browser?url=${encodeURIComponent(url)}&login=true`);
        }
    };

    const StepIndicator = () => (
        <View style={styles.indicatorContainer}>
            <View style={[styles.indicator, step === 1 && styles.indicatorActive]} />
            <View style={[styles.indicator, step === 2 && styles.indicatorActive]} />
            <View style={[styles.indicator, step === 3 && styles.indicatorActive]} />
        </View>
    );

    const renderStep1 = () => (
        <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Welcome to Flippo</Text>
            <Text style={styles.subtitle}>Your specialized assistant for unified reselling.</Text>

            <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>WHAT SHOULD WE CALL YOU?</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter your name (e.g. Alex)"
                    placeholderTextColor="#C7C7CC"
                    value={name}
                    onChangeText={setName}
                    autoFocus={Platform.OS === 'web' ? false : true}
                />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>Let's Start</Text>
                <FontAwesome name="arrow-right" size={16} color="#fff" />
            </TouchableOpacity>
        </Animated.View>
    );

    const renderStep2 = () => (
        <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.title}>Connect Marketplaces</Text>
            <Text style={styles.subtitle}>Log in once to enable Smart Sync & Auto-Compile.</Text>

            <View style={styles.accountsList}>
                {MARKETPLACES.map((marketplace) => (
                    <TouchableOpacity
                        key={marketplace.id}
                        style={styles.accountCard}
                        onPress={() => openLogin(marketplace.id)}
                    >
                        <MarketplaceLogo id={marketplace.id} style={styles.logoIcon} />
                        <View style={styles.accountInfo}>
                            <Text style={styles.accountName}>{marketplace.name}</Text>
                            <Text style={styles.accountDesc}>
                                {marketplace.id === 'vinted' && 'Syncs notifications & listings'}
                                {marketplace.id === 'ebay' && 'Supports quick auto-fill'}
                                {marketplace.id === 'subito' && 'Local sales management'}
                                {marketplace.id === 'depop' && 'Fashion marketplace'}
                                {marketplace.id === 'wallapop' && 'Buy & Sell Nearby'}
                            </Text>
                        </View>
                        <FontAwesome name="chevron-right" size={14} color="#C7C7CC" />
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
        </Animated.View>
    );

    const renderStep3 = () => (
        <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.successIcon}>
                <FontAwesome name="check" size={40} color="#fff" />
            </View>
            <Text style={styles.title}>All Set, {name || 'Reseller'}!</Text>
            <Text style={styles.subtitle}>Flippo will now run locally on your device.</Text>

            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <FontAwesome name="shield" size={18} color="#007AFF" />
                    <Text style={styles.infoText}>Zero cloud data storage</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                    <FontAwesome name="bolt" size={18} color="#FFCC00" />
                    <Text style={styles.infoText}>Background Sync Active</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>Open Dashboard</Text>
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <StepIndicator />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.contentContainer}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 25,
    },
    stepContent: {
        alignItems: 'center',
        width: '100%',
    },
    indicatorContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        position: 'absolute',
        top: 60,
        width: '100%',
        zIndex: 10,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E5E5EA',
    },
    indicatorActive: {
        backgroundColor: '#000',
        width: 20,
    },
    logo: {
        width: 280, // Using same large logo
        height: 280,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '800', // Bolder Apple header
        color: '#1C1C1E',
        marginBottom: 10,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#8E8E93',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    inputWrapper: {
        width: '100%',
        marginBottom: 30,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8E8E93',
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        width: '100%',
        backgroundColor: '#fff', // White Clean
        borderWidth: 1,
        borderColor: '#E5E5EA',
        padding: 18,
        borderRadius: 14,
        fontSize: 17,
        fontWeight: '500',
        color: '#000',
    },
    primaryBtn: {
        width: '100%',
        backgroundColor: '#000', // Sleek Black
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 17,
    },
    accountsList: {
        width: '100%',
        marginBottom: 30,
        gap: 15,
    },
    accountCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        // Removed shadows/margin bottom to fix gray artifacts
    },
    logoIcon: {
        width: 48,
        height: 48,
        marginRight: 16,
    },
    accountInfo: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    accountName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    accountDesc: {
        fontSize: 13,
        color: '#8E8E93',
    },
    successIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.light.success,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        shadowColor: Colors.light.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    infoCard: {
        width: '100%',
        backgroundColor: '#F2F2F7',
        borderRadius: 16,
        padding: 16,
        marginBottom: 40,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#3A3A3C',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E5EA',
        marginVertical: 12,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: {
        fontWeight: 'bold',
        fontSize: 17,
    },
    closeText: {
        color: '#007AFF',
        fontSize: 17,
        fontWeight: '600',
    }
});
