import { Text, View } from '@/components/Themed';
import { Colors } from '@/constants/Colors';
import { AuthService } from '@/services/AuthService';
import { MarketplaceConfig, SettingsService, UserProfile } from '@/services/settings';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Image, RefreshControl, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity } from 'react-native';

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
            router.push(`/(tabs)/browser?url=${encodeURIComponent(url)}&login=true`);
        }
    };

    const handleSaveProfile = async () => {
        await SettingsService.updateProfile(profile);
        setEditing(false);
        Alert.alert("Profile Updated", "Your changes have been saved.");
    };

    const handlePickAvatar = async () => {
        if (!editing) return; // Only allow changing when editing
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert("Permission", "We need access to your photos.");

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

    // Render Helpers
    const StatusBadge = ({ loggedIn }: { loggedIn: boolean }) => (
        <View style={[styles.badge, loggedIn ? styles.badgeSuccess : styles.badgeWarning]}>
            <Text style={[styles.badgeText, loggedIn ? styles.textSuccess : styles.textWarning]}>
                {loggedIn ? 'Connected' : 'Auth Expired'}
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile & Settings</Text>
                <TouchableOpacity onPress={() => editing ? handleSaveProfile() : setEditing(true)}>
                    <Text style={styles.editBtn}>{editing ? 'Done' : 'Edit'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}>

                {/* 1. User Card */}
                <View style={styles.card}>
                    <View style={styles.avatarContainer}>
                        <TouchableOpacity onPress={handlePickAvatar} disabled={!editing}>
                            <View style={styles.avatar}>
                                {profile.avatar ? (
                                    <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
                                ) : (
                                    <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase() || 'F'}</Text>
                                )}
                            </View>
                            {editing && (
                                <View style={styles.cameraIcon}>
                                    <FontAwesome name="camera" size={14} color="#fff" />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {editing ? (
                        <View style={{ width: '100%', marginTop: 15, backgroundColor: 'transparent' }}>
                            <Text style={styles.inputLabel}>Display Name</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.name}
                                onChangeText={t => setProfile({ ...profile, name: t })}
                            />
                            <Text style={styles.inputLabel}>Email (Private)</Text>
                            <TextInput
                                style={styles.input}
                                value={profile.email}
                                onChangeText={t => setProfile({ ...profile, email: t })}
                            />
                        </View>
                    ) : (
                        <View style={{ alignItems: 'center', marginTop: 10, backgroundColor: 'transparent' }}>
                            <Text style={styles.userName}>{profile.name}</Text>
                            <Text style={styles.userBio}>{profile.email || 'No email set'}</Text>
                        </View>
                    )}
                </View>

                {/* 2. Marketplace Manager */}
                <Text style={styles.sectionHeader}>CONNECTED MARKETPLACES</Text>
                <View style={styles.sectionContainer}>
                    {marketplaces.map((m) => {
                        const isConnected = connectedMarketplaces.includes(m.id);
                        return (
                            <View key={m.id} style={styles.row}>
                                <View style={styles.rowLeft}>
                                    <View style={[styles.iconBox, { backgroundColor: m.color }]}>
                                        <FontAwesome name={m.icon as any} size={18} color="#fff" />
                                    </View>
                                    <View>
                                        <Text style={styles.rowTitle}>{m.name}</Text>
                                        <Text style={styles.rowSubtitle}>
                                            {m.isEnabled ? (isConnected ? 'Ready to sync' : 'Requires login') : 'Disabled'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.rowRight}>
                                    {m.isEnabled && !isConnected && (
                                        <TouchableOpacity
                                            onPress={() => handleLogin(m.id)}
                                            style={{ marginRight: 10, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#007AFF', borderRadius: 8 }}
                                        >
                                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Login</Text>
                                        </TouchableOpacity>
                                    )}
                                    {m.isEnabled && isConnected && <StatusBadge loggedIn={isConnected} />}
                                    <Switch
                                        style={{ marginLeft: 10 }}
                                        value={m.isEnabled}
                                        onValueChange={(v) => toggleMarketplace(m.id, v)}
                                        trackColor={{ false: '#767577', true: Colors.light.primary }}
                                    />
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* 3. Global Settings */}
                <Text style={styles.sectionHeader}>APP SETTINGS</Text>
                <View style={styles.sectionContainer}>
                    <TouchableOpacity style={styles.rowBtn}>
                        <Text style={styles.rowBtnText}>Clear Cache</Text>
                        <FontAwesome name="angle-right" size={20} color="#C7C7CC" />
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.rowBtn}>
                        <Text style={styles.rowBtnText}>Privacy Policy</Text>
                        <FontAwesome name="angle-right" size={20} color="#C7C7CC" />
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.rowBtn} onPress={() => Alert.alert("Log Out", "Are you sure?", [{ text: "Cancel" }, { text: "Log Out", style: 'destructive' }])}>
                        <Text style={[styles.rowBtnText, { color: '#FF3B30' }]}>Log Out</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.version}>Flippo v1.0.2 (Beta)</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    header: {
        paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#fff',
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderBottomWidth: 1, borderBottomColor: '#E5E5EA'
    },
    headerTitle: { fontSize: 28, fontWeight: '800' },
    editBtn: { fontSize: 17, color: Colors.light.primary, fontWeight: '600' },

    scroll: { paddingBottom: 40 },

    // User Card
    card: {
        backgroundColor: '#fff', alignItems: 'center', padding: 25, margin: 20,
        borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05
    },
    avatarContainer: { position: 'relative' },
    avatar: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#F2F2F7',
        justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { fontSize: 32, fontWeight: '700', color: '#8E8E93' },
    cameraIcon: {
        position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.light.primary,
        width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#fff'
    },
    userName: { fontSize: 22, fontWeight: '700', marginTop: 10 },
    userBio: { fontSize: 15, color: '#8E8E93', marginTop: 4 },

    inputLabel: { alignSelf: 'flex-start', fontSize: 12, color: '#8E8E93', marginBottom: 5, marginTop: 10, fontWeight: '600', marginLeft: 4 },
    input: {
        width: '100%', backgroundColor: '#F2F2F7', borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 5
    },

    // Sections
    sectionHeader: { marginLeft: 20, marginBottom: 8, marginTop: 20, fontSize: 13, color: '#8E8E93', fontWeight: '600' },
    sectionContainer: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 16, overflow: 'hidden' },

    // Rows
    row: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, borderBottomWidth: 1, borderBottomColor: '#F2F2F7'
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowRight: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    rowTitle: { fontSize: 16, fontWeight: '600' },
    rowSubtitle: { fontSize: 13, color: '#8E8E93' },

    // Badges
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeSuccess: { backgroundColor: '#E4F9E9' },
    badgeWarning: { backgroundColor: '#FFF4E5' },
    badgeText: { fontSize: 11, fontWeight: '700' },
    textSuccess: { color: '#34C759' },
    textWarning: { color: '#FF9500' },

    rowBtn: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
    rowBtnText: { fontSize: 16 },
    divider: { height: 1, backgroundColor: '#F2F2F7', marginLeft: 16 },

    version: { textAlign: 'center', marginTop: 30, color: '#C7C7CC', fontSize: 12 }
});
