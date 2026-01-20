import { Text, View } from '@/components/Themed';
import { Colors } from '@/constants/Colors';
import { AuthService } from '@/services/AuthService';
import { MarketplaceConfig, SettingsService } from '@/services/settings';
import { InventoryCategory, StorageService } from '@/services/storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity } from 'react-native';

import { MarketplaceLogo } from '@/components/MarketplaceLogo';

const CATEGORIES: { id: InventoryCategory; label: string; icon: any; color: string }[] = [
    { id: 'Fashion', label: 'Clothes', icon: 'shopping-bag', color: '#FF2D55' },
    { id: 'Shoes', label: 'Shoes', icon: 'step-forward', color: '#5856D6' },
    { id: 'Bags', label: 'Bags', icon: 'shopping-basket', color: '#AF52DE' },
    { id: 'Accessories', label: 'Accessories', icon: 'magic', color: '#FF9500' },
    { id: 'Electronics', label: 'Electronics', icon: 'laptop', color: '#007AFF' },
    { id: 'Small Tech', label: 'Small Tech', icon: 'mobile', color: '#32ADE6' },
    { id: 'Videogames', label: 'Games', icon: 'gamepad', color: '#5856D6' },
    { id: 'Home', label: 'Home', icon: 'home', color: '#34C759' },
    { id: 'Entertainment', label: 'Media', icon: 'music', color: '#FF3B30' },
    { id: 'Beauty', label: 'Beauty', icon: 'flask', color: '#FF2D55' },
    { id: 'Sports', label: 'Sports', icon: 'futbol-o', color: '#00C7BE' },
    { id: 'Collectibles', label: 'Collectibles', icon: 'diamond', color: '#FFCC00' },
    { id: 'Motors', label: 'Motors', icon: 'car', color: '#8E8E93' },
    { id: 'Other', label: 'Other', icon: 'cube', color: '#8E8E93' },
];

export default function NewItemScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [images, setImages] = useState<string[]>([]);

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
    const [material, setMaterial] = useState('');
    const [model, setModel] = useState('');
    const [specs, setSpecs] = useState('');
    const [platform, setPlatform] = useState('');
    const [isbn, setIsbn] = useState('');
    const [hasBox, setHasBox] = useState(false);
    const [hasPapers, setHasPapers] = useState(false);
    const [hasReceipt, setHasReceipt] = useState(false);

    // UI State
    const [showPublishWizard, setShowPublishWizard] = useState(false);
    const [magicActive, setMagicActive] = useState(false);
    const [savedItemId, setSavedItemId] = useState<string | null>(null);
    const [marketplaces, setMarketplaces] = useState<MarketplaceConfig[]>([]);
    const [connectedMarketplaces, setConnectedMarketplaces] = useState<string[]>([]);
    const isEditing = !!params.id;

    useFocusEffect(useCallback(() => {
        loadMarketplaces();
        loadConnectedMarketplaces();
        if (params.id) {
            loadItem(params.id as string);
        }
        if (params.openWizard === 'true') {
            setShowPublishWizard(true);
        }
    }, [params.id, params.openWizard]));

    const loadConnectedMarketplaces = async () => {
        const connected = await AuthService.getConnections();
        setConnectedMarketplaces(connected);
    };

    const loadMarketplaces = async () => {
        const m = await SettingsService.getMarketplaces();
        setMarketplaces(m.filter(x => x.isEnabled));
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
            setMaterial(item.material || '');
            setModel(item.model || '');
            setSpecs(item.specs || '');
            setPlatform(item.platform || '');
            setIsbn(item.isbn || '');
            setHasBox(!!item.hasBox);
            setHasPapers(!!item.hasPapers);
            setHasReceipt(!!item.hasReceipt);
        }
    };

    const runMiniAI = () => {
        if (!title) return;
        const lowerTitle = title.toLowerCase();
        let detected = false;

        // Simple Heuristics for Category
        if (lowerTitle.includes('ps5') || lowerTitle.includes('nintendo') || lowerTitle.includes('game')) { setCategory('Videogames'); detected = true; }
        else if (lowerTitle.includes('iphone') || lowerTitle.includes('macbook')) { setCategory('Electronics'); detected = true; }
        else if (lowerTitle.includes('lego')) { setCategory('Collectibles'); detected = true; }

        // Simple Brand detection
        ['nike', 'adidas', 'apple', 'samsung', 'zara', 'sony', 'gucci', 'lego'].forEach(b => {
            if (lowerTitle.includes(b) && !brand) { setBrand(b.charAt(0).toUpperCase() + b.slice(1)); detected = true; }
        });

        if (detected) {
            setMagicActive(true);
            setTimeout(() => setMagicActive(false), 2000);
        }
    };

    const handleAddPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert("Permission Required", "Allow photo access.");

        let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
        if (!result.canceled) setImages([...images, result.assets[0].uri]);
    };

    const handleSave = async () => {
        if (!title) return Alert.alert("Required", "Please enter a title.");

        const itemData = {
            title, price, description, images, category,
            brand, condition, size, material, model, specs, platform, isbn,
            hasBox, hasPapers, hasReceipt, color: itemColor,
            quantity: parseInt(quantity) || 1,
            status
        };

        if (isEditing) {
            await StorageService.updateItem(params.id as string, itemData);
            Alert.alert("Success", "Item updated!");
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

        setShowPublishWizard(false);
        router.push({
            pathname: '/(tabs)/browser',
            params: { platform: platformId, autoFillMode: 'true', itemId: itemId }
        });
    };

    // Style Helpers
    const isFashion = ['Fashion', 'Shoes', 'Bags', 'Accessories'].includes(category);
    const isTech = ['Electronics', 'Small Tech'].includes(category);
    const isGaming = ['Videogames'].includes(category);

    const Chip = ({ label, selected, onPress }: { label: string, selected: boolean, onPress: () => void }) => (
        <TouchableOpacity style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <FontAwesome name="chevron-left" size={18} color="#1C1C1E" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditing ? 'Edit Item' : 'Create Item'}</Text>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView
                    style={styles.formContainer}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    {/* Category Selection */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                            {CATEGORIES.map(item => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.catCard,
                                        category === item.id ? { backgroundColor: item.color, borderColor: item.color, elevation: 4 } : { borderColor: '#E5E5EA' }
                                    ]}
                                    onPress={() => setCategory(item.id)}
                                >
                                    <FontAwesome name={item.icon} size={20} color={category === item.id ? '#fff' : item.color} />
                                    <Text style={[styles.catLabel, category === item.id && styles.catLabelActive]}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Image Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Images ({images.length}/5)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScroll}>
                            {images.map((uri, index) => (
                                <View key={index} style={styles.imageCard}>
                                    <Image source={{ uri }} style={styles.imagePreview} />
                                    <TouchableOpacity style={styles.removeImgBtn} onPress={() => setImages(images.filter((_, i) => i !== index))}>
                                        <FontAwesome name="times" size={10} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {images.length < 5 && (
                                <TouchableOpacity style={styles.imageCard} onPress={handleAddPhoto}>
                                    <FontAwesome name="camera" size={24} color="#8E8E93" />
                                    <Text style={styles.addImageText}>Add</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>

                    {/* Main Info Card */}
                    <View style={styles.card}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Title</Text>
                                <TextInput
                                    style={[styles.input, magicActive && { borderColor: Colors.light.primary, borderWidth: 2 }]}
                                    placeholder="e.g. Vintage Hoodie"
                                    value={title}
                                    onChangeText={setTitle}
                                    onBlur={runMiniAI}
                                />
                            </View>
                            {magicActive && <FontAwesome name="magic" size={20} color={Colors.light.primary} style={{ marginLeft: 10, marginTop: 15 }} />}
                        </View>

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text style={styles.inputLabel}>Price</Text>
                                <View style={styles.priceInputContainer}>
                                    <Text style={styles.currencySymbol}>€</Text>
                                    <TextInput
                                        style={styles.priceInput}
                                        placeholder="0.00"
                                        keyboardType="decimal-pad"
                                        value={price}
                                        onChangeText={setPrice}
                                    />
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Status</Text>
                                <View style={styles.statusRow}>
                                    {['Active', 'Draft'].map((s) => (
                                        <Chip key={s} label={s} selected={status === s} onPress={() => setStatus(s as any)} />
                                    ))}
                                </View>
                            </View>
                        </View>

                        <Text style={styles.inputLabel}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Describe what makes this item special..."
                            multiline
                            numberOfLines={4}
                            value={description}
                            onChangeText={setDescription}
                        />
                    </View>

                    {/* Details Card */}
                    {(isFashion || isTech || isGaming) && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Product Details</Text>

                            {isFashion && (
                                <View style={styles.detailRow}>
                                    <View style={{ flex: 1, marginRight: 12 }}>
                                        <Text style={styles.inputLabel}>Size</Text>
                                        <TextInput style={styles.input} placeholder="e.g. M / 42" value={size} onChangeText={setSize} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.inputLabel}>Condition</Text>
                                        <TextInput style={styles.input} placeholder="New, Good..." value={condition} onChangeText={setCondition} />
                                    </View>
                                </View>
                            )}

                            <Text style={styles.inputLabel}>Brand</Text>
                            <TextInput style={[styles.input, { marginBottom: 15 }]} placeholder="Brand name" value={brand} onChangeText={setBrand} />

                            {isTech && (
                                <View style={styles.detailRow}>
                                    <View style={{ flex: 1, marginRight: 12 }}>
                                        <Text style={styles.inputLabel}>Model</Text>
                                        <TextInput style={styles.input} placeholder="Model name" value={model} onChangeText={setModel} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.inputLabel}>Specs</Text>
                                        <TextInput style={styles.input} placeholder="RAM, Storage..." value={specs} onChangeText={setSpecs} />
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Extras */}
                    {(category === 'Collectibles' || isTech) && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Verification & Box</Text>
                            <View style={styles.switchRow}>
                                <Text style={styles.switchLabel}>Original Box</Text>
                                <Switch value={hasBox} onValueChange={setHasBox} trackColor={{ false: '#D1D1D6', true: Colors.light.primary }} />
                            </View>
                            <View style={styles.switchRow}>
                                <Text style={styles.switchLabel}>Original Receipt</Text>
                                <Switch value={hasReceipt} onValueChange={setHasReceipt} trackColor={{ false: '#D1D1D6', true: Colors.light.primary }} />
                            </View>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Wizard Modal */}
            <Modal visible={showPublishWizard} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.rocketIconBox}>
                                <FontAwesome name="rocket" size={24} color="#fff" />
                            </View>
                            <View>
                                <Text style={styles.modalTitle}>Perfect! Item Saved.</Text>
                                <Text style={styles.modalSubtitle}>Where do you want to list it first?</Text>
                            </View>
                        </View>

                        <ScrollView style={{ width: '100%', maxHeight: 350 }}>
                            {marketplaces.map(m => {
                                const isConnected = connectedMarketplaces.includes(m.id);
                                return (
                                    <TouchableOpacity
                                        key={m.id}
                                        style={styles.wizCard}
                                        onPress={() => handlePublish(m.id)}
                                    >
                                        <MarketplaceLogo id={m.id} style={styles.wizLogo} />
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.wizMarketTitle}>{m.name}</Text>
                                            <Text style={styles.wizMarketStatus}>{isConnected ? 'Connected' : 'Login required'}</Text>
                                        </View>
                                        <FontAwesome name={isConnected ? "magic" : "sign-in"} size={18} color={isConnected ? Colors.light.primary : "#8E8E93"} />
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <TouchableOpacity style={styles.closeBtn} onPress={() => { setShowPublishWizard(false); router.back(); }}>
                            <Text style={styles.closeBtnText}>I'll publish later</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7'
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
    saveBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    formContainer: { flex: 1 },
    section: { marginVertical: 15, paddingHorizontal: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 12 },
    categoryScroll: { gap: 12, paddingRight: 20 },
    catCard: {
        width: 85,
        height: 85,
        borderRadius: 20,
        borderWidth: 1.5,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8
    },
    catLabel: { fontSize: 11, fontWeight: '700', color: '#8E8E93', marginTop: 6, textAlign: 'center' },
    catLabelActive: { color: '#fff' },
    imageScroll: { gap: 12, paddingRight: 20 },
    imageCard: {
        width: 100,
        height: 100,
        borderRadius: 16,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#E5E5EA',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    imagePreview: { width: '100%', height: '100%' },
    removeImgBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(255,59,48,0.8)', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    addImageText: { fontSize: 12, color: '#8E8E93', marginTop: 4, fontWeight: '600' },
    card: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 2 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginBottom: 8, marginLeft: 4 },
    input: { backgroundColor: '#F2F2F7', borderRadius: 14, padding: 14, fontSize: 16, color: '#1C1C1E', marginBottom: 15 },
    textArea: { height: 120, textAlignVertical: 'top' },
    row: { flexDirection: 'row', marginBottom: 10 },
    priceInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 14, paddingHorizontal: 15 },
    currencySymbol: { fontSize: 18, fontWeight: '700', color: Colors.light.success, marginRight: 5 },
    priceInput: { flex: 1, paddingVertical: 14, fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
    statusRow: { flexDirection: 'row', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F2F2F7', borderWidth: 1, borderColor: '#E5E5EA' },
    chipSelected: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
    chipText: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
    chipTextSelected: { color: '#fff' },
    detailRow: { flexDirection: 'row' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
    switchLabel: { fontSize: 16, fontWeight: '500', color: '#1C1C1E' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, gap: 15 },
    rocketIconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.light.primary, justifyContent: 'center', alignItems: 'center' },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#1C1C1E' },
    modalSubtitle: { fontSize: 14, color: '#8E8E93' },
    wizCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', padding: 16, borderRadius: 20, marginBottom: 12 },
    wizLogo: { width: 80, height: 24 },
    wizMarketTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
    wizMarketStatus: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
    closeBtn: { marginTop: 15, alignSelf: 'center', padding: 10 },
    closeBtnText: { color: '#8E8E93', fontWeight: '600', fontSize: 15 },
});
