import { useState } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, Text, View } from 'react-native';

const MARKETPLACE_LOGOS: Record<string, string> = {
    'vinted': 'https://upload.wikimedia.org/wikipedia/commons/2/29/Vinted_logo.png',
    'ebay': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/EBay_logo.svg/512px-EBay_logo.svg.png',
    'subito': 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Subito.it_logo.png',
    'depop': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Depop_logo.svg/512px-Depop_logo.svg.png',
    'wallapop': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Wallapop_logo_2019.svg/512px-Wallapop_logo_2019.svg.png',
};

interface Props {
    id: string;
    style?: StyleProp<ImageStyle>;
    resizeMode?: 'contain' | 'cover';
}

export function MarketplaceLogo({ id, style, resizeMode = 'contain' }: Props) {
    const uri = MARKETPLACE_LOGOS[id.toLowerCase()];
    const [error, setError] = useState(false);

    if (!uri || error) {
        return (
            <View style={[styles.placeholder, style]}>
                <Text style={styles.placeholderText}>{id.charAt(0).toUpperCase()}</Text>
            </View>
        );
    }

    return (
        <Image
            source={{ uri }}
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
        backgroundColor: '#E5E5EA',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: '#8E8E93',
        fontWeight: 'bold',
        fontSize: 14,
    }
});
