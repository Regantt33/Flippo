import { MarketplaceLogo } from '@/components/MarketplaceLogo';
import { Colors } from '@/constants/Colors';
import { AuthService } from '@/services/AuthService';
import { MarketplaceConfig, SettingsService } from '@/services/settings';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PremiumButton = ({ onPress, children, style }: any) => {
    const scale = useRef(new Animated.Value(1)).current;
    const handlePressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
    const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

    return (
        <AnimatedPressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[style, { transform: [{ scale }] }]}
        >
            {children}
        </AnimatedPressable>
    );
};

export default function OnboardingScreen() {
    const params = useLocalSearchParams();
    const [step, setStep] = useState(1);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const [marketplaces, setMarketplaces] = useState<MarketplaceConfig[]>([]);

    useEffect(() => {
        loadMarketplaces();
        if (params.step) setStep(parseInt(params.step as string));
    }, [params.step]);

    const loadMarketplaces = async () => {
        const m = await SettingsService.getMarketplaces();
        setMarketplaces(m || []);
    };

    const handleNext = () => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
            if (step < 3) {
                setStep(step + 1);
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
            } else {
                router.replace('/(tabs)');
            }
        });
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
            {[1, 2, 3].map(i => (
                <View key={i} style={[styles.indicator, step === i && styles.indicatorActive]} />
            ))}
        </View>
    );

    const WelcomeStep = () => (
        <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
            <View style={styles.heroImageContainer}>
                <View style={styles.blob} />
                <FontAwesome name="rocket" size={80} color="#1C1C1E" />
            </View>
            <Text style={styles.title}>Vendi Ovunque,{"\n"}Senza Sforzo.</Text>
            <Text style={styles.subtitle}>Flippo automatizza le tue vendite sui principali marketplace di moda e tech.</Text>

            <PremiumButton style={styles.mainBtn} onPress={handleNext}>
                <Text style={styles.mainBtnText}>Inizia Ora</Text>
            </PremiumButton>
        </Animated.View>
    );

    const ConnectStep = () => (
        <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
            <Text style={styles.stepTitle}>Collega i tuoi store</Text>
            <Text style={styles.stepSubtitle}>Accedi ai tuoi account per abilitare la sincronizzazione automatica.</Text>

            <ScrollView style={styles.marketList} showsVerticalScrollIndicator={false}>
                {marketplaces.map((m) => (
                    <PremiumButton key={m.id} style={styles.marketCard} onPress={() => openLogin(m.id)}>
                        <MarketplaceLogo id={m.id} style={styles.marketLogo} />
                        <View style={styles.marketInfo}>
                            <Text style={styles.marketName}>{m.name}</Text>
                            <Text style={styles.marketAction}>Tocca per accedere</Text>
                        </View>
                        <FontAwesome name="chevron-right" size={12} color="#C7C7CC" />
                    </PremiumButton>
                ))}
            </ScrollView>

            <PremiumButton style={styles.mainBtn} onPress={handleNext}>
                <Text style={styles.mainBtnText}>Continua</Text>
            </PremiumButton>
        </Animated.View>
    );

    const FinalStep = () => (
        <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
            <View style={styles.successIconBox}>
                <FontAwesome name="check" size={40} color="#fff" />
            </View>
            <Text style={styles.title}>Sei Pronto!</Text>
            <Text style={styles.subtitle}>Il tuo assistente personale alle vendite è configurato e pronto all'azione.</Text>

            <PremiumButton style={styles.mainBtn} onPress={handleNext}>
                <Text style={styles.mainBtnText}>Vai alla Dashboard</Text>
            </PremiumButton>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <StepIndicator />
            </View>

            <View style={styles.content}>
                {step === 1 && <WelcomeStep />}
                {step === 2 && <ConnectStep />}
                {step === 3 && <FinalStep />}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: { paddingTop: 60, alignItems: 'center' },
    content: { flex: 1, paddingHorizontal: 40, justifyContent: 'center' },

    indicatorContainer: { flexDirection: 'row', gap: 8 },
    indicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F2F2F7' },
    indicatorActive: { width: 24, backgroundColor: '#1C1C1E' },

    stepContainer: { alignItems: 'center' },
    heroImageContainer: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
    blob: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: '#F8F9FB' },

    title: { fontSize: 32, fontWeight: '900', color: '#1C1C1E', textAlign: 'center', letterSpacing: -1, lineHeight: 38 },
    subtitle: { fontSize: 16, color: '#8E8E93', textAlign: 'center', marginTop: 16, lineHeight: 24, fontWeight: '500' },

    stepTitle: { fontSize: 28, fontWeight: '900', color: '#1C1C1E', alignSelf: 'flex-start', letterSpacing: -0.5 },
    stepSubtitle: { fontSize: 15, color: '#8E8E93', alignSelf: 'flex-start', marginTop: 8, marginBottom: 32, fontWeight: '500' },

    marketList: { width: '100%', maxHeight: 350, marginBottom: 32 },
    marketCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', padding: 20, borderRadius: 24, marginBottom: 16 },
    marketLogo: { width: 80, height: 24 },
    marketInfo: { flex: 1, marginLeft: 16 },
    marketName: { fontSize: 17, fontWeight: '800', color: '#1C1C1E' },
    marketAction: { fontSize: 12, color: Colors.light.primary, fontWeight: '700', marginTop: 2 },

    mainBtn: { width: '100%', height: 64, backgroundColor: '#1C1C1E', borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 5 },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

    successIconBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center', marginBottom: 40, shadowColor: '#34C759', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
});
