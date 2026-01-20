
import { Text, View } from '@/components/Themed';
import { Colors } from '@/constants/Colors';
import { MarketplaceConfig, SettingsService } from '@/services/settings';
import { InventoryCategory, StorageService } from '@/services/storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity } from 'react-native';

import { MarketplaceLogo } from '@/components/MarketplaceLogo';

const CATEGORIES: { id: InventoryCategory; label: string; icon: any; color: string }[] = [
    { id: 'Electronics', label: 'Tech', icon: 'laptop', color: '#34C759' },
    { id: 'Videogames', label: 'Games', icon: 'gamepad', color: '#5856D6' },
    { id: 'Fashion', label: 'Fashion', icon: 'shopping-bag', color: '#FF2D55' }, // Consolidated Category
    { id: 'Home', label: 'Home', icon: 'home', color: '#AF52DE' },
    { id: 'Entertainment', label: 'Media', icon: 'music', color: '#FF3B30' },
    { id: 'Sports', label: 'Sports', icon: 'futbol-o', color: '#00C7BE' },
    { id: 'Collectibles', label: 'Collectibles', icon: 'diamond', color: '#FFCC00' },
    { id: 'Motors', label: 'Motors', icon: 'car', color: '#8E8E93' },
    { id: 'Other', label: 'Other', icon: 'cube', color: '#8E8E93' },
];

const COLORS_PALETTE = [
    '#000000', '#FFFFFF', '#808080', '#FF0000', '#0000FF', '#008000', '#FFFF00', '#FFC0CB', '#800080', '#FFA500', '#A52A2A', '#D2691E'
];

export default function NewItemScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [images, setImages] = useState<string[]>([]);

    // Core
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<InventoryCategory>('Fashion');
    const [quantity, setQuantity] = useState('1');
    const [itemColor, setItemColor] = useState('');

    // Dynamic Fields
    const [brand, setBrand] = useState('');
    const [condition, setCondition] = useState('');

    // Fashion
    const [size, setSize] = useState('');
    const [material, setMaterial] = useState('');

    // Tech/Games
    const [model, setModel] = useState('');
    const [specs, setSpecs] = useState('');
    const [platform, setPlatform] = useState('');
    const [isbn, setIsbn] = useState('');

    // Authentication (Boolean)
    const [hasBox, setHasBox] = useState(false);
    const [hasPapers, setHasPapers] = useState(false);
    const [hasReceipt, setHasReceipt] = useState(false);

    const [showPublishWizard, setShowPublishWizard] = useState(false);
    const [magicActive, setMagicActive] = useState(false);
    const [savedItemId, setSavedItemId] = useState<string | null>(null);
    const [marketplaces, setMarketplaces] = useState<MarketplaceConfig[]>([]);
    const isEditing = !!params.id;

    useFocusEffect(useCallback(() => {
        loadMarketplaces();
        if (params.id) {
            loadItem(params.id as string);
        }
        if (params.openWizard === 'true') {
            setShowPublishWizard(true);
        }
    }, [params.id, params.openWizard]));

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
            setQuantity(item.quantity.toString());
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

    // AI Heuristics
    const runMiniAI = () => {
        if (!title) return;
        const lowerTitle = title.toLowerCase();
        let detected = false;

        // Category
        if (lowerTitle.includes('ps5') || lowerTitle.includes('nintendo') || lowerTitle.includes('game')) { setCategory('Videogames'); detected = true; }
        else if (lowerTitle.includes('iphone') || lowerTitle.includes('macbook')) { setCategory('Electronics'); detected = true; }
        else if (lowerTitle.includes('lego')) { setCategory('Collectibles'); detected = true; }
        else if (lowerTitle.includes('libro') || lowerTitle.includes('book')) { setCategory('Entertainment'); detected = true; }
        else if (lowerTitle.includes('jeans') || lowerTitle.includes('t-shirt') || lowerTitle.includes('dress') || lowerTitle.includes('scarpe')) {
            setCategory('Fashion');
            detected = true;
        }

        // Brand
        ['nike', 'adidas', 'apple', 'samsung', 'zara', 'sony', 'gucci', 'lego', 'rolex'].forEach(b => {
            if (lowerTitle.includes(b)) { setBrand(b.charAt(0).toUpperCase() + b.slice(1)); detected = true; }
        });

        // Condition
        if (lowerTitle.includes('nuovo') || lowerTitle.includes('sealed')) setCondition('New');

        // Auth
        if (lowerTitle.includes('full set') || lowerTitle.includes('scatola')) { setHasBox(true); setHasReceipt(true); detected = true; }

        if (detected) {
            setMagicActive(true);
            setTimeout(() => setMagicActive(false), 3000);
        }
    };

    const handleAddPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert("Permission Required", "Allow photo access to inventory items.");

        let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
        if (!result.canceled) setImages([...images, result.assets[0].uri]);
        if (!result.canceled) setImages([...images, result.assets[0].uri]);
    };

    const handlePublish = async (platformId: string) => {
        const itemId = savedItemId || (params.id as string);
        if (!itemId) return;

        // Optimistic update: mark as listed
        const currentItem = await StorageService.getItems().then(items => items.find(i => i.id === itemId));
        if (currentItem) {
            const currentListed = currentItem.listedOn || [];
            if (!currentListed.includes(platformId)) {
                await StorageService.updateItem(itemId, { listedOn: [...currentListed, platformId] });
            }
        }

        setShowPublishWizard(false);
        router.push({
            pathname: '/(tabs)/browser',
            params: { platform: platformId, autoFillMode: 'true', itemId: itemId }
        });
    };

    const handleSave = async () => {
        if (!title) return Alert.alert("Required", "Please enter a title.");

        // Smart Description Builder
        let fullDesc = description;

        const itemData = {
            title, price, description: fullDesc, images, category,
            brand, condition, size, material, model, specs, platform, isbn,
            hasBox, hasPapers, hasReceipt, color: itemColor,
            quantity: parseInt(quantity) || 1,
            status: 'Draft' as const
        };

        if (isEditing) {
            await StorageService.updateItem(params.id as string, itemData);
            Alert.alert("Updated", "Item updated successfully!");
            router.back();
        } else {
            // Append auto-generated details only if simple description provided
            const addLine = (label: string, val: string | undefined) => { if (val) fullDesc += `\n${label}: ${val}`; };
            const addBool = (label: string, val: boolean) => { if (val) fullDesc += `\n- ${label}`; };

            if (!description.includes('Brand:')) {
                fullDesc += '\n';
                addLine('Brand', brand);
                addLine('Size', size);
                addLine('Material', material);
                addLine('Model', model);
                addLine('Specs', specs);
                addLine('Platform', platform);
                addLine('Color', itemColor);
                addLine('ISBN', isbn);
                addLine('Condition', condition);
                if (category === 'Collectibles' || category === 'Electronics' || category === 'Fashion' || category === 'Videogames') {
                    addBool('Original Box Included', hasBox);
                    addBool('Original Papers Included', hasPapers);
                    addBool('Receipt Available', hasReceipt);
                }
            }

            const newItem = await StorageService.addItem({ ...itemData, description: fullDesc });
            setSavedItemId(newItem.id);
            setShowPublishWizard(true);
        }
    };

    // Helpers
    const isFashion = ['Fashion', 'Women', 'Men', 'Kids'].includes(category); // Keep old keys for backward comp
    const isTech = ['Electronics'].includes(category);
    const isGaming = ['Videogames'].includes(category);
    const isMedia = ['Entertainment'].includes(category);
    const isLuxury = ['Collectibles', 'Electronics', 'Fashion'].includes(category);

    const Chip = ({ label, selected, onPress }: { label: string, selected: boolean, onPress: () => void }) => (
        <TouchableOpacity style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
        </TouchableOpacity>
    );

    const BooleanSwitch = ({ label, value, onValueChange }: { label: string, value: boolean, onValueChange: (v: boolean) => void }) => (
        <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{label}</Text>
            <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#767577', true: Colors.light.primary }} />
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}><FontAwesome name="times" size={20} /></TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditing ? 'Edit Item' : 'New Item'}</Text>
                <TouchableOpacity onPress={handleSave}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    {/* Magic Input */}
                    <View style={[styles.magicContainer, magicActive && styles.magicActive]}>
                        <FontAwesome name="magic" size={16} color={magicActive ? '#fff' : Colors.light.primary} style={{ marginRight: 10 }} />
                        <TextInput
                            style={{ flex: 1, fontSize: 16, fontWeight: '500', color: magicActive ? '#fff' : '#000' }}
                            placeholder="What are you selling?"
                            placeholderTextColor={magicActive ? 'rgba(255,255,255,0.7)' : '#C7C7CC'}
                            value={title} onChangeText={setTitle} onBlur={runMiniAI}
                        />
                        {magicActive && <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>AUTO-FILLED!</Text>}
                    </View>

                    {/* Category Grid */}
                    <Text style={[styles.label, { marginHorizontal: 20, marginBottom: 10 }]}>Category</Text>
                    <View style={styles.catGrid}>
                        {CATEGORIES.map(item => (
                            <TouchableOpacity
                                key={item.id}
                                style={[
                                    styles.catCard,
                                    category === item.id ? { backgroundColor: item.color, borderColor: item.color, elevation: 5 } : { borderColor: '#E5E5EA' }
                                ]}
                                onPress={() => setCategory(item.id)}
                            >
                                <FontAwesome name={item.icon} size={24} color={category === item.id ? '#fff' : item.color} />
                                <Text style={[styles.catLabel, category === item.id && styles.catLabelActive]}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Photos */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 20, marginBottom: 25 }}>
                        <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddPhoto}>
                            <FontAwesome name="camera" size={24} color={Colors.light.primary} />
                            <Text style={styles.addPhotoText}>Add</Text>
                        </TouchableOpacity>
                        {images.map((img, idx) => <Image key={idx} source={{ uri: img }} style={styles.thumbnail} />)}
                    </ScrollView>

                    {/* DYNAMIC FIELDS FORM */}
                    <View style={styles.formSection}>
                        <View style={styles.row}>
                            <View style={[styles.field, { flex: 1, marginRight: 10 }]}>
                                <Text style={styles.label}>Price (€)</Text>
                                <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" />
                            </View>
                            <View style={[styles.field, { flex: 1 }]}>
                                <Text style={styles.label}>Qty</Text>
                                <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholder="1" />
                            </View>
                        </View>

                        {/* Fashion: Size, Brand, Material, Color */}
                        {isFashion && (
                            <>
                                <View style={styles.row}>
                                    <View style={[styles.field, { flex: 1, marginRight: 10 }]}>
                                        <Text style={styles.label}>Size</Text>
                                        <TextInput style={styles.input} value={size} onChangeText={setSize} placeholder="M / 42" />
                                    </View>
                                    <View style={[styles.field, { flex: 1 }]}>
                                        <Text style={styles.label}>Brand</Text>
                                        <TextInput style={styles.input} value={brand} onChangeText={setBrand} placeholder="Zara, Nike..." />
                                    </View>
                                </View>
                                <View style={styles.field}><Text style={styles.label}>Material</Text><TextInput style={styles.input} value={material} onChangeText={setMaterial} placeholder="Cotton, Silk..." /></View>
                            </>
                        )}

                        {/* Tech: Brand, Model, Specs */}
                        {isTech && (
                            <>
                                <View style={styles.field}><Text style={styles.label}>Brand</Text><TextInput style={styles.input} value={brand} onChangeText={setBrand} /></View>
                                <View style={styles.field}><Text style={styles.label}>Model</Text><TextInput style={styles.input} value={model} onChangeText={setModel} /></View>
                                <View style={styles.field}><Text style={styles.label}>Specs</Text><TextInput style={styles.input} value={specs} onChangeText={setSpecs} placeholder="256GB, M1 Pro..." /></View>
                            </>
                        )}

                        {/* Games: Platform */}
                        {isGaming && (
                            <View style={styles.field}><Text style={styles.label}>Platform</Text><TextInput style={styles.input} value={platform} onChangeText={setPlatform} placeholder="PS5, Switch..." /></View>
                        )}

                        {/* Books: ISBN */}
                        {isMedia && (
                            <View style={styles.field}><Text style={styles.label}>ISBN</Text><TextInput style={styles.input} value={isbn} onChangeText={setIsbn} keyboardType="number-pad" /></View>
                        )}

                        {/* Color Picker (Visual) */}
                        {(isFashion || category === 'Home' || category === 'Motors' || category === 'Electronics') && (
                            <View style={styles.field}>
                                <Text style={styles.label}>Color</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {COLORS_PALETTE.map(c => (
                                        <TouchableOpacity
                                            key={c}
                                            style={[styles.colorDot, { backgroundColor: c }, itemColor === c && styles.colorDotSelected]}
                                            onPress={() => setItemColor(c)}
                                        />
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Condition Chips */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Condition</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                {['New', 'Like New', 'Good', 'Fair', 'Damaged'].map(c => (
                                    <Chip key={c} label={c} selected={condition === c} onPress={() => setCondition(c)} />
                                ))}
                            </ScrollView>
                        </View>

                        {/* Authentication / Extras (Switches) */}
                        {isLuxury && (
                            <View style={styles.card}>
                                <Text style={[styles.label, { marginBottom: 10 }]}>EXTRAS</Text>
                                <BooleanSwitch label="Original Box" value={hasBox} onValueChange={setHasBox} />
                                <View style={styles.divider} />
                                <BooleanSwitch label="Original Papers" value={hasPapers} onValueChange={setHasPapers} />
                                <View style={styles.divider} />
                                <BooleanSwitch label="Receipt" value={hasReceipt} onValueChange={setHasReceipt} />
                            </View>
                        )}

                        <View style={styles.field}>
                            <Text style={styles.label}>Description</Text>
                            <TextInput style={[styles.input, styles.textArea]} multiline value={description} onChangeText={setDescription} placeholder="Detailed description..." />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Wizard Modal */}
            <Modal visible={showPublishWizard} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <FontAwesome name="rocket" size={24} color={Colors.light.primary} />
                            <Text style={styles.modalTitle}>Publish Item</Text>
                        </View>
                        <Text style={styles.modalSubtitle}>Select a marketplace to auto-fill details:</Text>

                        <ScrollView style={{ width: '100%', maxHeight: 300 }} contentContainerStyle={{ paddingVertical: 10 }}>
                            {marketplaces.length === 0 ? (
                                <Text style={{ textAlign: 'center', marginVertical: 20, color: '#8E8E93' }}>
                                    No marketplaces enabled.{'\n'}Go to Profile to connect.
                                </Text>
                            ) : (
                                marketplaces.map(m => (
                                    <TouchableOpacity
                                        key={m.id}
                                        style={styles.wizCard}
                                        onPress={() => handlePublish(m.id)}
                                    >
                                        <MarketplaceLogo
                                            id={m.id}
                                            style={styles.wizLogo}
                                        />
                                        <FontAwesome name="chevron-right" size={14} color="#C7C7CC" />
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>

                        <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setShowPublishWizard(false); router.back(); }}>
                            <Text style={styles.secondaryBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#fff' },
    headerTitle: { fontSize: 17, fontWeight: '600' },
    saveText: { fontSize: 17, fontWeight: '600', color: Colors.light.primary },
    scrollContent: { paddingBottom: 100 },
    magicContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 20, padding: 15, borderRadius: 12, shadowOpacity: 0.05 },
    magicActive: { backgroundColor: Colors.light.primary, transform: [{ scale: 1.02 }] },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10, marginBottom: 20 },
    catCard: { width: '30%', aspectRatio: 1, backgroundColor: '#fff', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA' }, // removed shadow
    catLabel: { fontSize: 11, marginTop: 8, color: '#333', fontWeight: '600' },
    catLabelActive: { color: '#fff' },
    addPhotoBtn: { width: 90, height: 90, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E5EA', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    addPhotoText: { fontSize: 11, color: Colors.light.primary, marginTop: 4 },
    thumbnail: { width: 90, height: 90, borderRadius: 12, marginRight: 10, backgroundColor: '#eee' },
    formSection: { paddingHorizontal: 20 },
    row: { flexDirection: 'row', marginBottom: 15 },
    field: { marginBottom: 15 },
    label: { fontSize: 13, color: '#8E8E93', marginBottom: 6, fontWeight: '600', marginLeft: 4 },
    input: { backgroundColor: '#fff', padding: 14, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#E5E5EA' },
    textArea: { height: 100, textAlignVertical: 'top' },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E5EA', marginRight: 8 },
    chipSelected: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
    chipText: { fontSize: 14, color: '#3A3A3C' },
    chipTextSelected: { color: '#fff', fontWeight: 'bold' },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20 },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    switchLabel: { fontSize: 16, fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#E5E5EA', marginVertical: 10 },
    colorDot: { width: 40, height: 40, borderRadius: 20, marginRight: 12, borderWidth: 1, borderColor: '#E5E5EA' },
    colorDotSelected: { borderWidth: 3, borderColor: Colors.light.primary },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 24, padding: 24, paddingBottom: 16, maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 5 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 },
    modalTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', color: '#1C1C1E' },
    modalSubtitle: { fontSize: 15, color: '#8E8E93', textAlign: 'center', marginBottom: 20 },
    wizCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F2F2F7' }, // removed shadow
    wizLogo: { width: 120, height: 40 },
    secondaryBtn: { paddingVertical: 12, marginTop: 4, alignSelf: 'center' },
    secondaryBtnText: { color: '#8E8E93', fontWeight: '600', fontSize: 15 },
    primaryBtn: { backgroundColor: Colors.light.primary, paddingVertical: 15, paddingHorizontal: 40, borderRadius: 16 }
});
