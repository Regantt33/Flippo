import { MarketplaceLogo } from '@/components/MarketplaceLogo';
import { PremiumButton } from '@/components/PremiumButton';
import { SwipeWrapper } from '@/components/SwipeWrapper';
import { BorderRadius, Colors, Shadows } from '@/constants/Colors';
import { Translations } from '@/constants/Translations';
import { AuthService } from '@/services/AuthService';
import { MarketplaceConfig, SettingsService, UserProfile } from '@/services/settings';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Image, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const [marketplaces, setMarketplaces] = useState<MarketplaceConfig[]>([]);
    const insets = useSafeAreaInsets();
    const [profile, setProfile] = useState<UserProfile>({ name: '', email: '', language: 'en' });
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [connectedMarketplaces, setConnectedMarketplaces] = useState<string[]>([]);

    const t = Translations[profile.language] || Translations.en;

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
        Alert.alert(t.profile_update_success, t.profile_update_message);
    };

    const handlePickAvatar = async () => {
        if (!editing) return;
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert(t.permission_denied, t.permission_photos_message);

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
        <SwipeWrapper leftRoute="/(tabs)/browser">
            <View style={styles.container}>
                {/* Decorative Background Elements */}
                <View style={styles.bgDecoration1} />
                <View style={styles.bgDecoration2} />

                <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
                    <Text style={styles.headerTitle}>{t.profile_title}</Text>
                    <PremiumButton style={styles.editBtn} onPress={() => editing ? handleSaveProfile() : setEditing(true)}>
                        <Text style={styles.editBtnText}>{editing ? t.done : t.edit}</Text>
                    </PremiumButton>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={Colors.light.primary} />}
                >
                    {/* 1. Profile Card */}
                    <View style={[styles.profileCard, editing && styles.profileCardEditing]}>
                        <PremiumButton onPress={handlePickAvatar} disabled={!editing} style={[styles.avatarContainer, editing ? { opacity: 0.9 } : {}]}>
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
                                        placeholder={t.onboarding_input_name_placeholder}
                                        placeholderTextColor="#C7C7CC"
                                        onChangeText={t => setProfile({ ...profile, name: t })}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        value={profile.email}
                                        placeholder="Email"
                                        placeholderTextColor="#C7C7CC"
                                        onChangeText={t => setProfile({ ...profile, email: t })}
                                    />
                                </View>
                            ) : (
                                <View>
                                    <Text style={styles.userName}>{profile.name || t.profile_seller_fallback}</Text>
                                    <Text style={styles.userEmail}>{profile.email || t.profile_no_email}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* 2. Preferences */}
                    <Text style={styles.sectionHeader}>{t.dashboard_all.toUpperCase()}</Text>
                    <View style={styles.section}>
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconBox, { backgroundColor: '#F2F2F7' }]}>
                                    <FontAwesome name="globe" size={18} color={Colors.light.icon} />
                                </View>
                                <View>
                                    <Text style={styles.rowTitle}>{t.profile_app_language}</Text>
                                    <Text style={styles.rowStatus}>{t.profile_language_impact}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.langSelector}>
                            {(['it', 'en', 'fr', 'es', 'de'] as const).map((lang) => (
                                <PremiumButton
                                    key={lang}
                                    style={[styles.langChip, profile.language === lang ? styles.langChipActive : {}]}
                                    onPress={async () => {
                                        if (profile.language === lang) return;
                                        setProfile({ ...profile, language: lang });
                                        await SettingsService.updateProfile({ ...profile, language: lang });
                                        router.replace('/loading');
                                    }}
                                >
                                    <Text style={[styles.langText, profile.language === lang && styles.langTextActive]}>
                                        {lang.toUpperCase()}
                                    </Text>
                                </PremiumButton>
                            ))}
                        </View>
                    </View>

                    {/* 3. Marketplaces */}
                    <Text style={styles.sectionHeader}>{t.profile_connected_marketplaces}</Text>
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
                                                    {m.isEnabled ? (isConnected ? t.onboarding_market_connected : t.disconnected) : t.disabled}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.rowRight}>
                                            {m.isEnabled && !isConnected && (
                                                <PremiumButton style={styles.loginBtn} onPress={() => handleLogin(m.id)}>
                                                    <Text style={styles.loginBtnText}>{t.browser_connect_platform}</Text>
                                                </PremiumButton>
                                            )}
                                            <Switch
                                                value={m.isEnabled}
                                                onValueChange={(v) => toggleMarketplace(m.id, v)}
                                                trackColor={{ false: '#F2F2F7', true: Colors.light.accent }}
                                            />
                                        </View>
                                    </View>
                                    {idx < marketplaces.length - 1 && <View style={styles.divider} />}
                                </View>
                            );
                        })}
                    </View>

                    {/* 3. Logic & Cache */}
                    <Text style={styles.sectionHeader}>{t.profile_system}</Text>
                    <View style={styles.section}>
                        <PremiumButton style={styles.actionRow} onPress={() => Alert.alert(t.completed, t.profile_update_success)}>
                            <Text style={styles.actionText}>{t.profile_clear_cache}</Text>
                            <FontAwesome name="chevron-right" size={12} color="#C7C7CC" />
                        </PremiumButton>
                        <View style={styles.divider} />
                        <PremiumButton style={styles.actionRow}>
                            <Text style={styles.actionText}>{t.profile_privacy_policy}</Text>
                            <FontAwesome name="chevron-right" size={12} color="#C7C7CC" />
                        </PremiumButton>
                        <View style={styles.divider} />
                        <PremiumButton style={styles.actionRow} onPress={() => Alert.alert(t.profile_disconnect, t.profile_logout_confirm, [{ text: t.cancel }, { text: t.profile_disconnect, style: 'destructive' }])}>
                            <Text style={[styles.actionText, { color: '#FF3B30' }]}>{t.profile_disconnect}</Text>
                        </PremiumButton>
                    </View>

                    <Text style={styles.footerText}>Selly v1.0.5 Premium Redesign</Text>
                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>
        </SwipeWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FEFBF8' },
    header: {
        paddingBottom: 20,
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.surfaceHighlight
    },
    headerTitle: { fontSize: 24, fontWeight: '900', color: Colors.light.text, letterSpacing: -0.5 },
    editBtn: { backgroundColor: Colors.light.surface, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    editBtnText: { fontSize: 13, color: Colors.light.text, fontWeight: '800' },

    scroll: { paddingBottom: 40 },

    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.surface,
        marginHorizontal: 24,
        marginTop: 24,
        padding: 24,
        borderRadius: BorderRadius.xxl,
        ...Shadows.md,
    },
    profileCardEditing: { backgroundColor: '#FEFBF8', borderWidth: 1, borderColor: Colors.light.accent + '30' },
    avatarContainer: { marginRight: 20, position: 'relative' },
    avatar: { width: 72, height: 72, borderRadius: 24, backgroundColor: Colors.light.background, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatarImage: { width: '100%', height: '100%' },
    cameraBadge: { display: 'none', position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.light.accent, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },

    profileInfo: { flex: 1 },
    userName: { fontSize: 20, fontWeight: '900', color: Colors.light.text },
    userEmail: { fontSize: 14, color: Colors.light.icon, fontWeight: '500', marginTop: 2 },

    editForm: { gap: 8 },
    input: {
        backgroundColor: Colors.light.surfaceHighlight,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: BorderRadius.sm,
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
    },

    sectionHeader: { marginHorizontal: 28, marginTop: 32, marginBottom: 12, fontSize: 11, fontWeight: '800', color: '#BDB9B0', letterSpacing: 1 },
    section: {
        backgroundColor: Colors.light.background,
        marginHorizontal: 24,
        borderRadius: BorderRadius.xxl,
        borderWidth: 1,
        borderColor: Colors.light.surfaceHighlight,
        overflow: 'hidden',
        ...Shadows.sm,
    },

    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    rowRight: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    rowTitle: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
    rowStatus: { fontSize: 12, color: '#8E8E93', fontWeight: '600', marginTop: 1 },

    langSelector: { flexDirection: 'row', gap: 10, marginTop: 12, paddingBottom: 4, paddingHorizontal: 20 },
    langChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#F0F0F0' },
    langChipActive: { backgroundColor: Colors.light.accent, borderColor: Colors.light.accent },
    langText: { fontSize: 13, fontWeight: '700', color: '#8E8E93' },
    langTextActive: { color: '#FFF' },

    loginBtn: { backgroundColor: Colors.light.accent + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 12 },
    loginBtnText: { color: Colors.light.accent, fontSize: 12, fontWeight: '800' },

    actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    actionText: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
    divider: { height: 1, backgroundColor: '#F2F2F7', marginHorizontal: 20 },

    footerText: { textAlign: 'center', marginTop: 40, color: '#C7C7CC', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    bgDecoration1: {
        position: 'absolute',
        top: 20,
        left: -30,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(214, 109, 69, 0.03)',
        zIndex: -1,
    },
    bgDecoration2: {
        position: 'absolute',
        bottom: 120,
        right: -40,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(214, 109, 69, 0.02)',
        zIndex: -1,
    },
});
