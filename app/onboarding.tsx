import { MarketplaceLogo } from '@/components/MarketplaceLogo';
import { Colors } from '@/constants/Colors';
import { Translations } from '@/constants/Translations';
import { AuthService } from '@/services/AuthService';
import { MarketplaceConfig, SettingsService } from '@/services/settings';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PremiumButton = ({ onPress, children, style, disabled }: any) => {
    const scale = useRef(new Animated.Value(1)).current;
    const handlePressIn = () => !disabled && Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
    const handlePressOut = () => !disabled && Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

    return (
        <AnimatedPressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            style={[style, { transform: [{ scale }] }]}
        >
            {children}
        </AnimatedPressable>
    );
};

export default function OnboardingScreen() {
    const params = useLocalSearchParams();
    const [step, setStep] = useState(1);
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const [marketplaces, setMarketplaces] = useState<MarketplaceConfig[]>([]);

    // Profile State
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [language, setLanguage] = useState<'it' | 'en' | 'fr' | 'es' | 'de'>('en');

    const t = Translations[language] || Translations.en;

    useEffect(() => {
        loadMarketplaces();
        if (params.step) setStep(parseInt(params.step as string));
        if (params.lang) setLanguage(params.lang as any);
    }, [params.step, params.lang]);

    const loadMarketplaces = async () => {
        const m = await SettingsService.getMarketplaces();
        const connected = await AuthService.getConnections();
        setMarketplaces(m?.map(item => ({
            ...item,
            isLoggedIn: connected.includes(item.id)
        })) || []);
    };

    const handleLanguageChange = async (newLang: any) => {
        if (language === newLang) return;
        setLanguage(newLang);
        await SettingsService.updateProfile({ language: newLang });
        router.replace({
            pathname: '/loading',
            params: { returnTo: '/onboarding?step=2&lang=' + newLang }
        });
    };

    const handleNext = async () => {
        if (step === 2) {
            // Save initial profile
            await SettingsService.updateProfile({ name, avatar: avatar || undefined, language });
        }

        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
            if (step < 4) {
                setStep(step + 1);
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
            } else {
                router.replace('/loading');
            }
        });
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });
        if (!result.canceled) setAvatar(result.assets[0].uri);
    };

    const openLogin = async (marketplaceId: string) => {
        const url = AuthService.getLoginUrl(marketplaceId);
        if (url) {
            await AuthService.setPendingLogin(marketplaceId);
            router.push(`/(tabs)/browser?url=${encodeURIComponent(url)}&login=true&source=onboarding`);
        }
    };

    const StepIndicator = () => (
        <View style={styles.indicatorContainer}>
            {[1, 2, 3, 4].map(i => (
                <View key={i} style={[styles.indicator, step === i && styles.indicatorActive]} />
            ))}
        </View>
    );

    const WelcomeStep = () => (
        <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
            <View style={styles.heroImageContainer}>
                <Image
                    source={require('@/assets/images/selly-logo.png')}
                    style={{ width: 120, height: 120 }}
                    resizeMode="contain"
                />
            </View>
            <Text style={styles.title}>{t.onboarding_welcome_title}</Text>
            <Text style={styles.subtitle}>{t.onboarding_welcome_subtitle}</Text>

            <View style={styles.spacer} />

            <PremiumButton style={styles.mainBtn} onPress={handleNext}>
                <Text style={styles.mainBtnText}>{t.onboarding_start_now}</Text>
            </PremiumButton>
        </Animated.View>
    );

    const ProfileStep = () => (
        <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
            <Text style={styles.stepTitle}>{t.onboarding_profile_title}</Text>
            <Text style={styles.stepSubtitle}>{t.onboarding_profile_subtitle}</Text>

            <View style={styles.profileSection}>
                <PremiumButton onPress={pickImage} style={styles.avatarPicker}>
                    {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.avatarImg} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <FontAwesome name="camera" size={24} color={Colors.light.primary} />
                        </View>
                    )}
                </PremiumButton>

                <View style={styles.inputCard}>
                    <Text style={styles.inputLabel}>{t.onboarding_input_name}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={t.onboarding_input_name_placeholder}
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View style={[styles.inputCard, { marginTop: 16 }]}>
                    <Text style={styles.inputLabel}>{t.onboarding_input_lang}</Text>
                    <View style={styles.langGrid}>
                        {(['it', 'en', 'fr', 'es', 'de'] as const).map(l => (
                            <PremiumButton
                                key={l}
                                style={[styles.langChip, language === l && styles.langChipActive]}
                                onPress={() => handleLanguageChange(l)}
                            >
                                <Text style={[styles.langText, language === l && styles.langTextActive]}>
                                    {l.toUpperCase()}
                                </Text>
                            </PremiumButton>
                        ))}
                    </View>
                </View>
            </View>

            <View style={styles.spacer} />

            <PremiumButton style={styles.mainBtn} onPress={handleNext}>
                <Text style={styles.mainBtnText}>{t.continue}</Text>
            </PremiumButton>
        </Animated.View>
    );

    const ConnectStep = () => (
        <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
            <Text style={styles.stepTitle}>{t.onboarding_connect_title}</Text>
            <Text style={styles.stepSubtitle}>{t.onboarding_connect_subtitle}</Text>

            <ScrollView style={styles.marketList} showsVerticalScrollIndicator={false}>
                {marketplaces.map((m) => (
                    <PremiumButton
                        key={m.id}
                        style={[styles.marketCard, m.isLoggedIn ? { borderColor: Colors.light.accent, backgroundColor: Colors.light.accent + '05' } : {}]}
                        onPress={() => m.isLoggedIn ? null : openLogin(m.id)}
                        disabled={m.isLoggedIn}
                    >
                        <MarketplaceLogo id={m.id} style={styles.marketLogo} />
                        <View style={styles.marketInfo}>
                            <Text style={styles.marketName}>{m.name}</Text>
                            <Text style={[styles.marketAction, m.isLoggedIn && { color: '#34C759' }]}>
                                {m.isLoggedIn ? t.onboarding_market_connected : t.onboarding_market_tap_login}
                            </Text>
                        </View>
                        {m.isLoggedIn ? (
                            <FontAwesome name="check-circle" size={18} color="#34C759" />
                        ) : (
                            <FontAwesome name="chevron-right" size={12} color="#C7C7CC" />
                        )}
                    </PremiumButton>
                ))}
            </ScrollView>

            <View style={styles.spacer} />

            <PremiumButton style={styles.mainBtn} onPress={handleNext}>
                <Text style={styles.mainBtnText}>{t.onboarding_finish_btn}</Text>
            </PremiumButton>
        </Animated.View>
    );

    const FinalStep = () => (
        <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
            <View style={styles.successIconBox}>
                <FontAwesome name="check" size={40} color="#fff" />
            </View>
            <Text style={styles.title}>{t.onboarding_final_title}</Text>
            <Text style={styles.subtitle}>{t.onboarding_final_subtitle}</Text>

            <View style={styles.spacer} />

            <PremiumButton style={styles.mainBtn} onPress={handleNext}>
                <Text style={styles.mainBtnText}>{t.onboarding_open_dashboard}</Text>
            </PremiumButton>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
                <StepIndicator />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
                {/* Decorative Background Elements */}
                <View style={styles.bgDecoration1} />
                <View style={styles.bgDecoration2} />

                {step === 1 && <WelcomeStep />}
                {step === 2 && <ProfileStep />}
                {step === 3 && <ConnectStep />}
                {step === 4 && <FinalStep />}
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FEFBF8' },
    header: { alignItems: 'center', paddingBottom: 20 },
    content: { flex: 1, paddingHorizontal: 32, justifyContent: 'center' },

    indicatorContainer: { flexDirection: 'row', gap: 8 },
    indicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.light.surfaceHighlight },
    indicatorActive: { width: 24, backgroundColor: Colors.light.accent },

    stepContainer: { alignItems: 'center', width: '100%' },
    heroImageContainer: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
    blob: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: Colors.light.surface },

    title: { fontSize: 32, fontWeight: '900', color: Colors.light.text, textAlign: 'center', letterSpacing: -1.2, lineHeight: 40 },
    subtitle: { fontSize: 16, color: Colors.light.icon, textAlign: 'center', marginTop: 16, lineHeight: 24, fontWeight: '500' },

    spacer: { height: 48 }, // Fix for "minimo spazio tra testo e pulsanti"

    stepTitle: { fontSize: 28, fontWeight: '900', color: '#1C1C1E', alignSelf: 'flex-start', letterSpacing: -0.5 },
    stepSubtitle: { fontSize: 15, color: '#8E8E93', alignSelf: 'flex-start', marginTop: 8, marginBottom: 40, fontWeight: '500' },

    // Profile Step Styles
    profileSection: { width: '100%', alignItems: 'center' },
    avatarPicker: { width: 120, height: 120, borderRadius: 44, backgroundColor: Colors.light.surface, marginBottom: 32, overflow: 'hidden' },
    avatarPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    avatarImg: { width: '100%', height: '100%' },
    inputCard: { width: '100%', backgroundColor: Colors.light.surface, padding: 20, borderRadius: 24 },
    inputLabel: { fontSize: 11, fontWeight: '800', color: '#BDB9B0', letterSpacing: 1, marginBottom: 12 },
    input: { fontSize: 18, fontWeight: '700', color: Colors.light.text },

    marketList: { width: '100%', maxHeight: 350 },
    marketCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.surface, padding: 20, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.surfaceHighlight },
    marketLogo: { width: 48, height: 48, borderRadius: 8 },
    marketInfo: { flex: 1, marginLeft: 16 },
    marketName: { fontSize: 17, fontWeight: '800', color: Colors.light.text },
    marketAction: { fontSize: 12, color: Colors.light.accent, fontWeight: '700', marginTop: 2 },

    mainBtn: { width: '100%', height: 64, backgroundColor: '#1C1C1E', borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 5 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

    langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    langChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#E5E5E5' },
    langChipActive: { backgroundColor: Colors.light.accent, borderColor: Colors.light.accent },
    langText: { fontSize: 13, fontWeight: '700', color: '#8E8E93' },
    langTextActive: { color: '#FFF' },

    successIconBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center', marginBottom: 40, shadowColor: '#34C759', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
    bgDecoration1: {
        position: 'absolute',
        top: -40,
        left: -40,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(214, 109, 69, 0.03)',
        zIndex: -1,
    },
    bgDecoration2: {
        position: 'absolute',
        bottom: 20,
        right: -60,
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: 'rgba(214, 109, 69, 0.02)',
        zIndex: -1,
    },
});
