import { useState } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, Text, View } from 'react-native';

// Local assets for reliable loading
const MARKETPLACE_LOGOS: Record<string, any> = {
    'vinted': require('../assets/logos/vinted.png'),
    'ebay': require('../assets/logos/ebay.png'),
    'subito': require('../assets/logos/subito.png'),
    'depop': require('../assets/logos/depop.png'),
    'wallapop': require('../assets/logos/wallapop.png'),
};

// Fallback URLs for logos not available locally (none needed now)
const MARKETPLACE_LOGO_URLS: Record<string, string> = {};

interface Props {
    id: string;
    style?: StyleProp<ImageStyle>;
    resizeMode?: 'contain' | 'cover';
}

export function MarketplaceLogo({ id, style, resizeMode = 'contain' }: Props) {
    const [error, setError] = useState(false);
    const lowerId = id.toLowerCase();
    const localAsset = MARKETPLACE_LOGOS[lowerId];
    const urlAsset = MARKETPLACE_LOGO_URLS[lowerId];

    // If error or no asset available, show placeholder
    if (error || (!localAsset && !urlAsset)) {
        return (
            <View style={[styles.placeholder, style]}>
                <Text style={styles.placeholderText}>{id.charAt(0).toUpperCase()}</Text>
            </View>
        );
    }

    // Use local asset if available
    if (localAsset) {
        return (
            <Image
                source={localAsset}
                style={[styles.base, style]}
                resizeMode={resizeMode}
                onError={() => setError(true)}
            />
        );
    }

    // Fallback to URL
    return (
        <Image
            source={{ uri: urlAsset }}
            style={[styles.base, style]}
            resizeMode={resizeMode}
            onError={() => setError(true)}
        />
    );
}

const styles = StyleSheet.create({
    base: {
        width: 40,
        height: 40,
    },
    placeholder: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    }
});
