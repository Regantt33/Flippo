import { Colors } from '@/constants/Colors';
import { Translations } from '@/constants/Translations';
import { AuthService } from '@/services/AuthService';
import { MarketplaceConfig, SettingsService } from '@/services/settings';
import { InventoryCategory, StorageService } from '@/services/storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Animated, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MarketplaceLogo } from '@/components/MarketplaceLogo';

// --- PREMIUM COMPONENTS ---

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

const SectionHeader = ({ icon, title }: { icon: any, title: string }) => (
    <View style={styles.sectionHeaderContainer}>
        <FontAwesome name={icon} size={14} color={Colors.light.accent} style={{ marginRight: 8 }} />
        <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
);

// --- LOGIC & CONSTANTS ---

// Comprehensive Categories
const CATEGORIES: { id: InventoryCategory; labelKey: string; icon: any; subtextKey: string }[] = [
    { id: 'Fashion', labelKey: 'new_item_cat_fashion', icon: 'tag', subtextKey: 'new_item_cat_fashion_sub' },
    { id: 'Shoes', labelKey: 'new_item_cat_shoes', icon: 'bolt', subtextKey: 'new_item_cat_shoes_sub' },
    { id: 'Bags', labelKey: 'new_item_cat_bags', icon: 'shopping-bag', subtextKey: 'new_item_cat_bags_sub' },
    { id: 'Accessories', labelKey: 'new_item_cat_accessories', icon: 'magic', subtextKey: 'new_item_cat_accessories_sub' },
    { id: 'Electronics', labelKey: 'new_item_cat_electronics', icon: 'mobile', subtextKey: 'new_item_cat_electronics_sub' },
    { id: 'Videogames', labelKey: 'new_item_cat_videogames', icon: 'gamepad', subtextKey: 'new_item_cat_videogames_sub' },
    { id: 'Collectibles', labelKey: 'new_item_cat_collectibles', icon: 'diamond', subtextKey: 'new_item_cat_collectibles_sub' },
    { id: 'Home', labelKey: 'new_item_cat_home', icon: 'home', subtextKey: 'new_item_cat_home_sub' },
    { id: 'Entertainment', labelKey: 'new_item_cat_entertainment', icon: 'music', subtextKey: 'new_item_cat_entertainment_sub' },
    { id: 'Beauty', labelKey: 'new_item_cat_beauty', icon: 'heart', subtextKey: 'new_item_cat_beauty_sub' },
    { id: 'Sports', labelKey: 'new_item_cat_sports', icon: 'soccer-ball-o', subtextKey: 'new_item_cat_sports_sub' },
    { id: 'Pets', labelKey: 'new_item_cat_pets', icon: 'paw', subtextKey: 'new_item_cat_pets_sub' },
    { id: 'Motors', labelKey: 'new_item_cat_motors', icon: 'car', subtextKey: 'new_item_cat_motors_sub' },
    { id: 'Other', labelKey: 'new_item_cat_other', icon: 'cube', subtextKey: 'new_item_cat_other_sub' },
];

const CONDITIONS = []; // Will be populated from t.new_item_conditions

export default function NewItemScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const [images, setImages] = useState<string[]>([]);
    const [language, setLanguage] = useState<'it' | 'en' | 'fr' | 'es' | 'de'>('en');

    // Core State
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<InventoryCategory>('Fashion');
    const [status, setStatus] = useState<'Active' | 'Draft' | 'Sold'>('Draft');
    const [quantity, setQuantity] = useState('1');
    const [itemColor, setItemColor] = useState('');
    const [brand, setBrand] = useState('');
    const [condition, setCondition] = useState('');
    const [size, setSize] = useState('');

    // Tech/Specifics
    const [model, setModel] = useState('');
    const [platform, setPlatform] = useState('');

    // Toggles
    const [hasBox, setHasBox] = useState(false);
    const [hasReceipt, setHasReceipt] = useState(false);

    // UI State
    const [showPublishWizard, setShowPublishWizard] = useState(false);
    const [magicActive, setMagicActive] = useState(false);
    const [savedItemId, setSavedItemId] = useState<string | null>(null);
    const [marketplaces, setMarketplaces] = useState<MarketplaceConfig[]>([]);
    const [connectedMarketplaces, setConnectedMarketplaces] = useState<string[]>([]);

    const isEditing = !!params.id;
    const t = Translations[language] || Translations.en;

    useFocusEffect(useCallback(() => {
        loadData();
        if (params.openWizard === 'true') {
            setShowPublishWizard(true);
        }
    }, [params.id, params.openWizard]));

    const loadData = async () => {
        const m = await SettingsService.getMarketplaces();
        setMarketplaces(m.filter(x => x.isEnabled));
        const connected = await AuthService.getConnections();
        setConnectedMarketplaces(connected);
        const p = await SettingsService.getProfile();
        setLanguage(p.language);

        if (params.id) {
            loadItem(params.id as string);
        }
    };

    const loadItem = async (id: string) => {
        const items = await StorageService.getItems();
        const item = items.find(i => i.id === id);
        if (item) {
            setTitle(item.title);
            setPrice(item.price);
            setDescription(item.description);
            setCategory(item.category);
            setImages(item.images || []);
            setQuantity(item.quantity?.toString() || '1');
            setStatus(item.status || 'Draft');
            setItemColor(item.color || '');
            setBrand(item.brand || '');
            setCondition(item.condition || '');
            setSize(item.size || '');
            setModel(item.model || '');
            setPlatform(item.platform || '');
            setHasBox(!!item.hasBox);
            setHasReceipt(!!item.hasReceipt);
        }
    };

    const runMiniAI = () => {
        if (!title) return;
        const lowerTitle = title.toLowerCase();
        let detected = false;

        // Simple heuristic detector for immediate feedback
        if (lowerTitle.includes('ps5') || lowerTitle.includes('nintendo') || lowerTitle.includes('xbox')) { setCategory('Videogames'); detected = true; }
        else if (lowerTitle.includes('iphone') || lowerTitle.includes('samsung') || lowerTitle.includes('macbook')) { setCategory('Electronics'); detected = true; }
        else if (lowerTitle.includes('lego') || lowerTitle.includes('funko')) { setCategory('Collectibles'); detected = true; }
        else if (lowerTitle.includes('crema') || lowerTitle.includes('profumo')) { setCategory('Beauty'); detected = true; }
        else if (lowerTitle.includes('auto') || lowerTitle.includes('moto') || lowerTitle.includes('ricambi')) { setCategory('Motors'); detected = true; }

        if (detected) {
            setMagicActive(true);
            setTimeout(() => setMagicActive(false), 2000);
        }
    };

    const handleAddPhoto = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') return Alert.alert(t.permission_denied, t.permission_photos_message);

            let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
            if (!result.canceled) setImages([...images, result.assets[0].uri]);
        } catch (e) { console.error(e); }
    };

    const handleSave = async () => {
        if (!title) return Alert.alert(t.error, t.onboarding_input_name_placeholder);

        const itemData = {
            title, price, description, images, category,
            brand, condition, size, model, platform,
            hasBox, hasReceipt, color: itemColor,
            quantity: parseInt(quantity) || 1,
            status
        };

        if (isEditing) {
            await StorageService.updateItem(params.id as string, itemData);
            router.back();
        } else {
            const newItem = await StorageService.addItem(itemData);
            setSavedItemId(newItem.id);
            setShowPublishWizard(true);
        }
    };

    const handlePublish = async (platformId: string) => {
        const itemId = savedItemId || (params.id as string);
        if (!itemId) return;

        // --- PLATFORM COMPATIBILITY CHECKS ---
        if (platformId === 'vinted' && category === 'Motors') {
            Alert.alert(
                t.error,
                t.new_item_vinted_motors_error,
                [{ text: t.done }]
            );
            return;
        }

        setShowPublishWizard(false);
        router.push({
            pathname: '/(tabs)/browser',
            params: { platform: platformId, autoFillMode: 'true', itemId: itemId }
        });
    };

    return (
        <View style={styles.container}>
            {/* Header with Glass effect feel */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
                <PremiumButton style={styles.headerBtn} onPress={() => router.back()}>
                    <FontAwesome name="chevron-left" size={16} color="#1C1C1E" />
                </PremiumButton>
                <Text style={styles.headerTitle}>{isEditing ? t.edit : t.inventory_new_item}</Text>
                <PremiumButton style={styles.saveBtn} onPress={handleSave}>
                    <Text style={styles.saveBtnText}>{t.save}</Text>
                </PremiumButton>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView
                    style={styles.form}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 120 }}
                >
                    {/* Decorative Background Elements */}
                    <View style={styles.bgDecoration1} />
                    <View style={styles.bgDecoration2} />
                    {/* 1. MEDIA SECTION */}
                    <View style={styles.imageSection}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScroll}>
                            <PremiumButton style={styles.addPhotoCard} onPress={handleAddPhoto}>
                                <View style={styles.addPhotoIcon}>
                                    <FontAwesome name="camera" size={24} color={Colors.light.accent} />
                                </View>
                                <Text style={styles.addPhotoText}>{t.new_item_add_photos}</Text>
                            </PremiumButton>
                            {images.map((uri, index) => (
                                <View key={index} style={styles.photoCard}>
                                    <Image source={{ uri }} style={styles.photo} />
                                    <PremiumButton style={styles.removePhotoBtn} onPress={() => setImages(images.filter((_, i) => i !== index))}>
                                        <FontAwesome name="times" size={10} color="#fff" />
                                    </PremiumButton>
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    {/* 2. CATEGORY SELECTOR (GRID) */}
                    <View style={styles.section}>
                        <SectionHeader icon="tag" title={t.new_item_select_category.toUpperCase()} />
                        <View style={[styles.card, { padding: 16 }]}>
                            {/* Grid Layout using flexWrap */}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {CATEGORIES.map(item => (
                                    <PremiumButton
                                        key={item.id}
                                        style={[styles.catChip, category === item.id ? styles.catChipActive : {}]}
                                        onPress={() => setCategory(item.id)}
                                    >
                                        <FontAwesome name={item.icon} size={14} color={category === item.id ? '#FFF' : '#1C1C1E'} />
                                        <View style={{ marginLeft: 8 }}>
                                            <Text style={[styles.catText, category === item.id && styles.catTextActive]}>{(t as any)[item.labelKey]}</Text>
                                            <Text style={[styles.catSub, category === item.id && styles.catSubActive]}>{(t as any)[item.subtextKey]}</Text>
                                        </View>
                                    </PremiumButton>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* 3. MAIN INFO */}
                    <View style={styles.section}>
                        <SectionHeader icon="pencil" title={t.new_item_main_info.toUpperCase()} />
                        <View style={styles.card}>
                            <Text style={styles.inputLabel}>{t.new_item_title}</Text>
                            <TextInput
                                style={[styles.inputLarge, magicActive && styles.inputMagic]}
                                placeholder={t.new_item_title_placeholder}
                                placeholderTextColor="#C7C7CC"
                                value={title}
                                onChangeText={setTitle}
                                onBlur={runMiniAI}
                            />

                            <View style={{ height: 16 }} />

                            {/* Price & Quantity ROW */}
                            <View style={styles.row}>
                                <View style={[styles.inputBox, { flex: 1, marginRight: 12 }]}>
                                    <Text style={styles.inputLabel}>{t.new_item_price} (€)</Text>
                                    <TextInput
                                        style={styles.inputText}
                                        placeholder="0.00"
                                        keyboardType="decimal-pad"
                                        value={price}
                                        onChangeText={setPrice}
                                    />
                                </View>
                                <View style={[styles.inputBox, { width: 100 }]}>
                                    <Text style={styles.inputLabel}>{t.new_item_quantity}</Text>
                                    <TextInput
                                        style={styles.inputText}
                                        placeholder="1"
                                        keyboardType="number-pad"
                                        value={quantity}
                                        onChangeText={setQuantity}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* 4. DETAILS GRID */}
                    <View style={styles.section}>
                        <SectionHeader icon="sliders" title={t.new_item_specs.toUpperCase()} />
                        <View style={styles.card}>
                            {/* Conditions Selector */}
                            <Text style={[styles.inputLabel, { marginBottom: 8 }]}>{t.new_item_condition}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
                                {(t.new_item_conditions || []).map((c: string) => (
                                    <PremiumButton
                                        key={c}
                                        style={[styles.condChip, condition === c && styles.condChipActive]}
                                        onPress={() => setCondition(c)}
                                    >
                                        <Text style={[styles.condText, condition === c && styles.condTextActive]}>{c}</Text>
                                    </PremiumButton>
                                ))}
                            </ScrollView>

                            {/* Specific Fields Grid */}
                            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                                <View style={[styles.inputBox, { flex: 1, minWidth: '45%' }]}>
                                    <Text style={styles.inputLabel}>{t.new_item_brand}</Text>
                                    <TextInput style={styles.inputText} placeholder="es. Zara" value={brand} onChangeText={setBrand} />
                                </View>

                                <View style={[styles.inputBox, { flex: 1, minWidth: '45%' }]}>
                                    <Text style={styles.inputLabel}>{t.new_item_color}</Text>
                                    <TextInput style={styles.inputText} placeholder="es. Nero" value={itemColor} onChangeText={setItemColor} />
                                </View>

                                {(category === 'Fashion' || category === 'Shoes' || category === 'Bags' || category === 'Accessories') && (
                                    <View style={[styles.inputBox, { flex: 1, minWidth: '45%' }]}>
                                        <Text style={styles.inputLabel}>{t.new_item_size}</Text>
                                        <TextInput style={styles.inputText} placeholder="es. M, 42" value={size} onChangeText={setSize} />
                                    </View>
                                )}

                                {(category === 'Videogames' || category === 'Electronics') && (
                                    <View style={[styles.inputBox, { flex: 1, minWidth: '45%' }]}>
                                        <Text style={styles.inputLabel}>{t.new_item_platform_model}</Text>
                                        <TextInput style={styles.inputText} placeholder="es. PS5" value={platform || model} onChangeText={t => { setPlatform(t); setModel(t); }} />
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* 5. DESCRIPTION */}
                    <View style={styles.section}>
                        <SectionHeader icon="align-left" title={t.new_item_description.toUpperCase()} />
                        <View style={styles.card}>
                            <TextInput
                                style={styles.textArea}
                                placeholder={t.new_item_description_placeholder}
                                placeholderTextColor="#C7C7CC"
                                multiline
                                numberOfLines={6}
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>
                    </View>

                    {/* 6. EXTRAS */}
                    <View style={styles.section}>
                        <SectionHeader icon="check-square-o" title={t.new_item_extra} />
                        <View style={styles.card}>
                            <View style={styles.switchRow}>
                                <Text style={styles.switchLabel}>{t.new_item_has_box}</Text>
                                <Switch value={hasBox} onValueChange={setHasBox} trackColor={{ false: '#F2F2F7', true: Colors.light.accent }} />
                            </View>
                            <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: '#F5F5F5' }]}>
                                <Text style={styles.switchLabel}>{t.new_item_has_receipt}</Text>
                                <Switch value={hasReceipt} onValueChange={setHasReceipt} trackColor={{ false: '#F2F2F7', true: Colors.light.accent }} />
                            </View>
                        </View>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* WIZARD MODAL */}
            <Modal visible={showPublishWizard} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.wizardContent}>
                        <View style={styles.wizardHeader}>
                            <View style={styles.wizardIndicator} />
                            <Text style={styles.wizardTitle}>{t.new_item_ready} 🚀</Text>
                            <Text style={styles.wizardSubtitle}>{t.new_item_choose_publish}</Text>
                        </View>

                        <View style={styles.wizardList}>
                            {marketplaces.map(m => {
                                const isConnected = connectedMarketplaces.includes(m.id);
                                return (
                                    <PremiumButton
                                        key={m.id}
                                        style={styles.wizItem}
                                        onPress={() => handlePublish(m.id)}
                                    >
                                        <MarketplaceLogo id={m.id} style={styles.wizLogo} />
                                        <View style={styles.wizInfo}>
                                            <Text style={styles.wizName}>{m.name}</Text>
                                            <Text style={styles.wizStatus}>{isConnected ? t.onboarding_market_connected : t.browser_login_required}</Text>
                                        </View>
                                        <FontAwesome name="chevron-right" size={12} color="#C7C7CC" />
                                    </PremiumButton>
                                );
                            })}
                        </View>

                        <PremiumButton style={styles.wizardClose} onPress={() => { setShowPublishWizard(false); router.replace('/(tabs)/inventory'); }}>
                            <Text style={styles.wizardCloseText}>{t.new_item_publish_later}</Text>
                        </PremiumButton>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FEFBF8' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingBottom: 16,
        backgroundColor: '#FEFBF8', borderBottomWidth: 1, borderBottomColor: '#F0F0F0'
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
    headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F2ED', justifyContent: 'center', alignItems: 'center' },
    saveBtn: { backgroundColor: '#1C1C1E', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

    form: { flex: 1 },

    imageSection: { marginTop: 20, marginBottom: 24, paddingLeft: 20 },
    imageScroll: { gap: 12, paddingRight: 20 },
    addPhotoCard: { width: 100, height: 130, borderRadius: 16, borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
    addPhotoIcon: { marginBottom: 8 },
    addPhotoText: { fontSize: 11, fontWeight: '700', color: Colors.light.accent, textAlign: 'center' },
    photoCard: { width: 100, height: 130, borderRadius: 16, overflow: 'hidden', backgroundColor: '#EEE' },
    photo: { width: '100%', height: '100%' },
    removePhotoBtn: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

    section: { paddingHorizontal: 20, marginBottom: 24 },
    sectionHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sectionHeaderText: { fontSize: 12, fontWeight: '800', color: '#8E8E93', letterSpacing: 1, textTransform: 'uppercase' },

    card: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#F5F5F7' },

    // Grid Chips
    catChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F7', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, marginBottom: 4 },
    catChipActive: { backgroundColor: Colors.light.accent },
    catText: { fontSize: 13, fontWeight: '700', color: '#1C1C1E' },
    catTextActive: { color: '#FFF' },
    catSub: { fontSize: 10, fontWeight: '500', color: '#8E8E93' },
    catSubActive: { color: 'rgba(255,255,255,0.7)' },

    inputLarge: { fontSize: 16, fontWeight: '600', color: '#1C1C1E', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EFEFEF' },
    inputMagic: { color: Colors.light.accent },

    row: { flexDirection: 'row' },
    inputBox: { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F0F0F0' },
    inputLabel: { fontSize: 11, fontWeight: '700', color: '#8E8E93', marginBottom: 4, textTransform: 'uppercase' },
    inputText: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },

    condChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#E5E5EA' },
    condChipActive: { backgroundColor: Colors.light.accent, borderColor: Colors.light.accent },
    condText: { fontSize: 13, fontWeight: '600', color: '#1C1C1E' },
    condTextActive: { color: '#FFF' },

    textArea: { fontSize: 15, lineHeight: 22, color: '#1C1C1E', minHeight: 80, textAlignVertical: 'top' },

    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    switchLabel: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },

    // Wizard
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    wizardContent: { backgroundColor: '#FFF', borderRadius: 32, padding: 32, alignItems: 'center' },
    wizardHeader: { width: '100%', alignItems: 'center', marginBottom: 24 },
    wizardIndicator: { width: 40, height: 4, backgroundColor: '#E5E5EA', borderRadius: 2, marginBottom: 20 },
    wizardTitle: { fontSize: 24, fontWeight: '800', marginBottom: 10, color: '#1C1C1E' },
    wizardSubtitle: { fontSize: 15, color: '#8E8E93', textAlign: 'center', lineHeight: 22 },
    wizardList: { width: '100%', gap: 12, marginBottom: 24 },
    wizItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#F0F0F0' },
    wizLogo: { width: 44, height: 44, borderRadius: 10, marginRight: 16 },
    wizInfo: { flex: 1 },
    wizName: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
    wizStatus: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
    wizardClose: { paddingVertical: 12 },
    wizardCloseText: { fontSize: 15, fontWeight: '600', color: '#8E8E93' },
    bgDecoration1: {
        position: 'absolute',
        top: 100,
        right: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(214, 109, 69, 0.03)',
        zIndex: -1,
    },
    bgDecoration2: {
        position: 'absolute',
        bottom: 50,
        left: -80,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: 'rgba(214, 109, 69, 0.02)',
        zIndex: -1,
    },
});
