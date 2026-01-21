import { Colors } from '@/constants/Colors';
import { AuthService } from '@/services/AuthService';
import { MarketplaceConfig, SettingsService } from '@/services/settings';
import { InventoryCategory, StorageService } from '@/services/storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Animated, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { MarketplaceLogo } from '@/components/MarketplaceLogo';

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

const CATEGORIES: { id: InventoryCategory; label: string; icon: any }[] = [
    { id: 'Fashion', label: 'Moda', icon: 'tag' },
    { id: 'Shoes', label: 'Scarpe', icon: 'bolt' },
    { id: 'Bags', label: 'Borse', icon: 'shopping-bag' },
    { id: 'Accessories', label: 'Accessori', icon: 'magic' },
    { id: 'Electronics', label: 'Tech', icon: 'laptop' },
    { id: 'Small Tech', label: 'Gadget', icon: 'mobile' },
    { id: 'Videogames', label: 'Gaming', icon: 'gamepad' },
    { id: 'Home', label: 'Casa', icon: 'home' },
    { id: 'Entertainment', label: 'Media', icon: 'music' },
    { id: 'Beauty', label: 'Beauty', icon: 'heart' },
    { id: 'Sports', label: 'Sport', icon: 'soccer-ball-o' },
    { id: 'Collectibles', label: '希少', icon: 'diamond' },
    { id: 'Motors', label: 'Auto', icon: 'car' },
    { id: 'Other', label: 'Altro', icon: 'cube' },
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

        if (lowerTitle.includes('ps5') || lowerTitle.includes('nintendo') || lowerTitle.includes('game')) { setCategory('Videogames'); detected = true; }
        else if (lowerTitle.includes('iphone') || lowerTitle.includes('macbook')) { setCategory('Electronics'); detected = true; }
        else if (lowerTitle.includes('lego')) { setCategory('Collectibles'); detected = true; }

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
        if (status !== 'granted') return Alert.alert("Permesso Negato", "Selly ha bisogno dell'accesso alle foto.");

        let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
        if (!result.canceled) setImages([...images, result.assets[0].uri]);
    };

    const handleSave = async () => {
        if (!title) return Alert.alert("Attenzione", "Il titolo è obbligatorio.");

        const itemData = {
            title, price, description, images, category,
            brand, condition, size, material, model, specs, platform, isbn,
            hasBox, hasPapers, hasReceipt, color: itemColor,
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

        setShowPublishWizard(false);
        router.push({
            pathname: '/(tabs)/browser',
            params: { platform: platformId, autoFillMode: 'true', itemId: itemId }
        });
    };

    // Style Helpers
    const isFashion = ['Fashion', 'Shoes', 'Bags', 'Accessories'].includes(category);
    const isTech = ['Electronics', 'Small Tech'].includes(category);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <PremiumButton style={styles.headerBtn} onPress={() => router.back()}>
                    <FontAwesome name="chevron-left" size={16} color="#1C1C1E" />
                </PremiumButton>
                <Text style={styles.headerTitle}>{isEditing ? 'Modifica Oggetto' : 'Nuovo Oggetto'}</Text>
                <PremiumButton style={styles.saveBtn} onPress={handleSave}>
                    <Text style={styles.saveBtnText}>Salva</Text>
                </PremiumButton>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView
                    style={styles.form}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    {/* Image Area */}
                    <View style={styles.imageSection}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScroll}>
                            <PremiumButton style={styles.addPhotoCard} onPress={handleAddPhoto}>
                                <View style={styles.addPhotoIcon}>
                                    <FontAwesome name="camera" size={24} color={Colors.light.primary} />
                                </View>
                                <Text style={styles.addPhotoText}>Aggiungi Foto</Text>
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

                    {/* Category Carousel */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>Categoria</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                            {CATEGORIES.map(item => (
                                <PremiumButton
                                    key={item.id}
                                    style={[styles.categoryCard, category === item.id && styles.categoryCardActive]}
                                    onPress={() => setCategory(item.id)}
                                >
                                    <FontAwesome name={item.icon} size={18} color={category === item.id ? '#fff' : '#1C1C1E'} />
                                    <Text style={[styles.categoryLabel, category === item.id && styles.categoryLabelActive]}>{item.label}</Text>
                                </PremiumButton>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Form Fields */}
                    <View style={styles.card}>
                        <Text style={styles.inputLabel}>Informazioni Principali</Text>
                        <TextInput
                            style={[styles.input, magicActive && styles.inputMagic]}
                            placeholder="Cosa stai vendendo?"
                            placeholderTextColor="#C7C7CC"
                            value={title}
                            onChangeText={setTitle}
                            onBlur={runMiniAI}
                        />

                        <View style={styles.row}>
                            <View style={[styles.inputContainer, { flex: 1, marginRight: 12 }]}>
                                <Text style={styles.currency}>€</Text>
                                <TextInput
                                    style={styles.priceInput}
                                    placeholder="0.00"
                                    placeholderTextColor="#C7C7CC"
                                    keyboardType="decimal-pad"
                                    value={price}
                                    onChangeText={setPrice}
                                />
                            </View>
                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <TextInput
                                    style={styles.priceInput}
                                    placeholder="Quantità"
                                    placeholderTextColor="#C7C7CC"
                                    keyboardType="number-pad"
                                    value={quantity}
                                    onChangeText={setQuantity}
                                />
                            </View>
                        </View>

                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Descrizione dettagliata..."
                            placeholderTextColor="#C7C7CC"
                            multiline
                            numberOfLines={4}
                            value={description}
                            onChangeText={setDescription}
                        />
                    </View>

                    {/* Smart Details */}
                    {(isFashion || isTech) && (
                        <View style={styles.card}>
                            <Text style={styles.inputLabel}>Dettagli Tecnici</Text>
                            <View style={styles.row}>
                                <TextInput
                                    style={[styles.input, { flex: 1, marginRight: 12 }]}
                                    placeholder={isFashion ? "Taglia" : "Modello"}
                                    placeholderTextColor="#C7C7CC"
                                    value={isFashion ? size : model}
                                    onChangeText={isFashion ? setSize : setModel}
                                />
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="Colore"
                                    placeholderTextColor="#C7C7CC"
                                    value={itemColor}
                                    onChangeText={setItemColor}
                                />
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Marca / Designer"
                                placeholderTextColor="#C7C7CC"
                                value={brand}
                                onChangeText={setBrand}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Condizione (es. Nuovo con cartellino)"
                                placeholderTextColor="#C7C7CC"
                                value={condition}
                                onChangeText={setCondition}
                            />
                        </View>
                    )}

                    {/* Extra Settings */}
                    <View style={styles.card}>
                        <Text style={styles.inputLabel}>Altro</Text>
                        <View style={styles.switchRow}>
                            <Text style={styles.switchText}>Scatola Inclusa</Text>
                            <Switch value={hasBox} onValueChange={setHasBox} trackColor={{ false: '#F2F2F7', true: Colors.light.primary }} />
                        </View>
                        <View style={styles.switchRow}>
                            <Text style={styles.switchText}>Ricevuta/Garanzia</Text>
                            <Switch value={hasReceipt} onValueChange={setHasReceipt} trackColor={{ false: '#F2F2F7', true: Colors.light.primary }} />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Wizard Redesign */}
            <Modal visible={showPublishWizard} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.wizardContent}>
                        <View style={styles.wizardHeader}>
                            <View style={styles.wizardIndicator} />
                            <Text style={styles.wizardTitle}>Ottimo Lavoro!</Text>
                            <Text style={styles.wizardSubtitle}>L'oggetto è pronto. Dove vuoi pubblicarlo?</Text>
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
                                            <Text style={styles.wizStatus}>{isConnected ? 'Pronto all\'invio' : 'Richiede Login'}</Text>
                                        </View>
                                        <FontAwesome name="magic" size={16} color={isConnected ? Colors.light.primary : '#C7C7CC'} />
                                    </PremiumButton>
                                );
                            })}
                        </View>

                        <PremiumButton style={styles.wizardClose} onPress={() => { setShowPublishWizard(false); router.replace('/(tabs)/inventory'); }}>
                            <Text style={styles.wizardCloseText}>Lo farò più tardi</Text>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7'
    },
    headerBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F8F9FB', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#1C1C1E' },
    saveBtn: { backgroundColor: '#1C1C1E', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14 },
    saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

    form: { flex: 1 },
    imageSection: { paddingVertical: 24 },
    imageScroll: { paddingHorizontal: 24, gap: 16 },
    addPhotoCard: { width: 120, height: 160, borderRadius: 24, backgroundColor: Colors.light.primary + '08', borderStyle: 'dashed', borderWidth: 2, borderColor: Colors.light.primary + '30', justifyContent: 'center', alignItems: 'center' },
    addPhotoIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.light.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    addPhotoText: { fontSize: 12, fontWeight: '800', color: Colors.light.primary },
    photoCard: { width: 120, height: 160, borderRadius: 24, overflow: 'hidden' },
    photo: { width: '100%', height: '100%' },
    removePhotoBtn: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center' },

    section: { marginBottom: 32 },
    sectionHeader: { fontSize: 18, fontWeight: '900', color: '#1C1C1E', marginLeft: 24, marginBottom: 16, letterSpacing: -0.5 },
    categoryScroll: { paddingHorizontal: 24, gap: 12 },
    categoryCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#F2F2F7' },
    categoryCardActive: { backgroundColor: '#1C1C1E', borderColor: '#1C1C1E' },
    categoryLabel: { fontSize: 14, fontWeight: '700', color: '#1C1C1E', marginLeft: 10 },
    categoryLabelActive: { color: '#fff' },

    card: { backgroundColor: '#FEFBF8', paddingHorizontal: 24, marginBottom: 32 },
    inputLabel: { fontSize: 12, fontWeight: '800', color: '#C7C7CC', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
    input: { backgroundColor: '#F8F9FB', borderRadius: 16, padding: 18, fontSize: 16, fontWeight: '600', color: '#1C1C1E', marginBottom: 16 },
    inputMagic: { borderColor: Colors.light.primary, borderWidth: 1, backgroundColor: Colors.light.primary + '05' },
    textArea: { height: 120, textAlignVertical: 'top' },

    row: { flexDirection: 'row' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', borderRadius: 16, paddingHorizontal: 18, height: 58, marginBottom: 16 },
    currency: { fontSize: 18, fontWeight: '800', color: '#1C1C1E', marginRight: 8 },
    priceInput: { flex: 1, fontSize: 16, fontWeight: '800', color: '#1C1C1E' },

    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    switchText: { fontSize: 16, fontWeight: '600', color: '#8E8E93' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
    wizardContent: { backgroundColor: '#FEFBF8', borderRadius: 32, padding: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 30 },
    wizardHeader: { alignItems: 'center', marginBottom: 32 },
    wizardIndicator: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#F2F2F7', marginBottom: 24 },
    wizardTitle: { fontSize: 24, fontWeight: '900', color: '#1C1C1E', marginBottom: 8 },
    wizardSubtitle: { fontSize: 15, color: '#8E8E93', textAlign: 'center', fontWeight: '500' },
    wizardList: { gap: 12, marginBottom: 32 },
    wizItem: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, backgroundColor: '#F8F9FB' },
    wizLogo: { width: 48, height: 48, borderRadius: 8 },
    wizInfo: { flex: 1, marginLeft: 16 },
    wizName: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
    wizStatus: { fontSize: 12, color: '#8E8E93', fontWeight: '600' },
    wizardClose: { alignSelf: 'center' },
    wizardCloseText: { fontSize: 15, fontWeight: '700', color: '#8E8E93' },
});
