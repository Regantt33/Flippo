import { MarketplaceLogo } from '@/components/MarketplaceLogo';
import { Colors } from '@/constants/Colors';
import { AuthService } from '@/services/AuthService';
import { MarketplaceConfig, SettingsService, UserProfile } from '@/services/settings';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Animated, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PremiumButton = ({ onPress, children, style, disabled }: any) => {
    const scale = useRef(new Animated.Value(1)).current;
    const handlePressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
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

export default function ProfileScreen() {
    const [marketplaces, setMarketplaces] = useState<MarketplaceConfig[]>([]);
    const [profile, setProfile] = useState<UserProfile>({ name: '', email: '' });
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [connectedMarketplaces, setConnectedMarketplaces] = useState<string[]>([]);

    const loadData = async () => {
        setLoading(true);
        const m = await SettingsService.getMarketplaces();
        const p = await SettingsService.getProfile();
        const connected = await AuthService.getConnections();
        setMarketplaces(m);
        setProfile(p);
        setConnectedMarketplaces(connected);
        setLoading(false);
    };

    useFocusEffect(useCallback(() => {
        loadData();
    }, []));

    const toggleMarketplace = async (id: any, val: boolean) => {
        const updated = await SettingsService.updateMarketplace(id, { isEnabled: val });
        if (updated) setMarketplaces(updated);
    };

    const handleLogin = async (marketplaceId: string) => {
        const url = AuthService.getLoginUrl(marketplaceId);
        if (url) {
            await AuthService.setPendingLogin(marketplaceId);
            router.push(`/(tabs)/browser?url=${encodeURIComponent(url)}&login=true&source=profile`);
        }
    };

    const handleSaveProfile = async () => {
        await SettingsService.updateProfile(profile);
        setEditing(false);
        Alert.alert("Profilo Aggiornato", "Le modifiche sono state salvate.");
    };

    const handlePickAvatar = async () => {
        if (!editing) return;
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert("Permesso Negato", "Selly ha bisogno dell'accesso alle foto.");

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setProfile({ ...profile, avatar: result.assets[0].uri });
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Impostazioni</Text>
                <PremiumButton style={styles.editBtn} onPress={() => editing ? handleSaveProfile() : setEditing(true)}>
                    <Text style={styles.editBtnText}>{editing ? 'Fine' : 'Modifica'}</Text>
                </PremiumButton>
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={Colors.light.primary} />}
            >
                {/* 1. Profile Card */}
                <View style={[styles.profileCard, editing && styles.profileCardEditing]}>
                    <PremiumButton onPress={handlePickAvatar} disabled={!editing} style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            {profile.avatar ? (
                                <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
                            ) : (
                                <FontAwesome name="user-o" size={30} color={Colors.light.primary} />
                            )}
                        </View>
                        {editing && (
                            <View style={styles.cameraBadge}>
                                <FontAwesome name="camera" size={10} color="#fff" />
                            </View>
                        )}
                    </PremiumButton>

                    <View style={styles.profileInfo}>
                        {editing ? (
                            <View style={styles.editForm}>
                                <TextInput
                                    style={styles.input}
                                    value={profile.name}
                                    placeholder="Il tuo nome"
                                    placeholderTextColor="#C7C7CC"
                                    onChangeText={t => setProfile({ ...profile, name: t })}
                                />
                                <TextInput
                                    style={styles.input}
                                    value={profile.email}
                                    placeholder="La tua email"
                                    placeholderTextColor="#C7C7CC"
                                    onChangeText={t => setProfile({ ...profile, email: t })}
                                />
                            </View>
                        ) : (
                            <View>
                                <Text style={styles.userName}>{profile.name || 'Utente Selly'}</Text>
                                <Text style={styles.userEmail}>{profile.email || 'Nessuna email collegata'}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* 2. Marketplaces */}
                <Text style={styles.sectionHeader}>MARKETPLACE COLLEGATI</Text>
                <View style={styles.section}>
                    {marketplaces.map((m, idx) => {
                        const isConnected = connectedMarketplaces.includes(m.id);
                        return (
                            <View key={m.id}>
                                <View style={styles.row}>
                                    <View style={styles.rowLeft}>
                                        <View style={[styles.iconBox, { backgroundColor: '#fff', overflow: 'hidden' }]}>
                                            <MarketplaceLogo id={m.id} style={{ width: '100%', height: '100%' }} />
                                        </View>
                                        <View>
                                            <Text style={styles.rowTitle}>{m.name}</Text>
                                            <Text style={styles.rowStatus}>
                                                {m.isEnabled ? (isConnected ? 'Connesso' : 'Disconnesso') : 'Disabilitato'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.rowRight}>
                                        {m.isEnabled && !isConnected && (
                                            <PremiumButton style={styles.loginBtn} onPress={() => handleLogin(m.id)}>
                                                <Text style={styles.loginBtnText}>Login</Text>
                                            </PremiumButton>
                                        )}
                                        <Switch
                                            value={m.isEnabled}
                                            onValueChange={(v) => toggleMarketplace(m.id, v)}
                                            trackColor={{ false: '#F2F2F7', true: Colors.light.primary }}
                                        />
                                    </View>
                                </View>
                                {idx < marketplaces.length - 1 && <View style={styles.divider} />}
                            </View>
                        );
                    })}
                </View>

                {/* 3. Logic & Cache */}
                <Text style={styles.sectionHeader}>SISTEMA</Text>
                <View style={styles.section}>
                    <PremiumButton style={styles.actionRow} onPress={() => Alert.alert("Cache Pulita", "I dati temporanei sono stati rimossi.")}>
                        <Text style={styles.actionText}>Svuota Cache</Text>
                        <FontAwesome name="chevron-right" size={12} color="#C7C7CC" />
                    </PremiumButton>
                    <View style={styles.divider} />
                    <PremiumButton style={styles.actionRow}>
                        <Text style={styles.actionText}>Informativa Privacy</Text>
                        <FontAwesome name="chevron-right" size={12} color="#C7C7CC" />
                    </PremiumButton>
                    <View style={styles.divider} />
                    <PremiumButton style={styles.actionRow} onPress={() => Alert.alert("Esci", "Vuoi davvero uscire?", [{ text: "Annulla" }, { text: "Esci", style: 'destructive' }])}>
                        <Text style={[styles.actionText, { color: '#FF3B30' }]}>Disconnetti</Text>
                    </PremiumButton>
                </View>

                <Text style={styles.footerText}>Selly v1.0.5 Premium Redesign</Text>
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FEFBF8' },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7'
    },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#1C1C1E', letterSpacing: -0.5 },
    editBtn: { backgroundColor: '#F8F9FB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    editBtnText: { fontSize: 13, color: '#1C1C1E', fontWeight: '800' },

    scroll: { paddingBottom: 40 },

    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FB',
        marginHorizontal: 24,
        marginTop: 24,
        padding: 24,
        borderRadius: 32,
    },
    profileCardEditing: { backgroundColor: '#FEFBF8', borderWidth: 1, borderColor: Colors.light.primary + '30' },
    avatarContainer: { marginRight: 20, position: 'relative' },
    avatar: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#FEFBF8', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatarImage: { width: '100%', height: '100%' },
    cameraBadge: { display: 'none', position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.light.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },

    profileInfo: { flex: 1 },
    userName: { fontSize: 20, fontWeight: '900', color: '#1C1C1E' },
    userEmail: { fontSize: 14, color: '#8E8E93', fontWeight: '500', marginTop: 2 },

    editForm: { gap: 8 },
    input: { backgroundColor: '#F2F2F7', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, fontSize: 14, fontWeight: '600', color: '#1C1C1E' },

    sectionHeader: { marginHorizontal: 28, marginTop: 32, marginBottom: 12, fontSize: 11, fontWeight: '800', color: '#C7C7CC', letterSpacing: 1 },
    section: { backgroundColor: '#FEFBF8', marginHorizontal: 24, borderRadius: 28, borderWidth: 1, borderColor: '#F2F2F7', overflow: 'hidden' },

    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    rowRight: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    rowTitle: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
    rowStatus: { fontSize: 12, color: '#8E8E93', fontWeight: '600', marginTop: 1 },

    loginBtn: { backgroundColor: Colors.light.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 12 },
    loginBtnText: { color: Colors.light.primary, fontSize: 12, fontWeight: '800' },

    actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    actionText: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
    divider: { height: 1, backgroundColor: '#F2F2F7', marginHorizontal: 20 },

    footerText: { textAlign: 'center', marginTop: 40, color: '#C7C7CC', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }
});
