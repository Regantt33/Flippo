/**
 * GradientCard - Premium card with gradient background
 * The WOW factor component for modern UI
 */

import { BorderRadius, Gradients, Shadows } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface GradientCardProps {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    colors?: readonly [string, string, ...string[]];
    variant?: 'surface' | 'accent' | 'hero';
    onPress?: () => void;
    delay?: number;
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export const GradientCard: React.FC<GradientCardProps> = ({
    children,
    style,
    colors,
    variant = 'surface',
    onPress,
    delay = 0,
}) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0);

    React.useEffect(() => {
        opacity.value = withTiming(1, {
            duration: 500,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
        });
    }, []);

    const getGradientColors = () => {
        if (colors) return colors;
        switch (variant) {
            case 'accent':
                return Gradients.accentWarm;
            case 'hero':
                return Gradients.surfaceElevated;
            default:
                return Gradients.warmSurface;
        }
    };

    const handlePressIn = () => {
        if (onPress) {
            scale.value = withSpring(0.98, { damping: 15, stiffness: 200 });
        }
    };

    const handlePressOut = () => {
        if (onPress) {
            scale.value = withSpring(1, { damping: 15, stiffness: 200 });
        }
    };

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    return (
        <AnimatedLinearGradient
            colors={getGradientColors()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
                styles.card,
                variant === 'accent' && styles.accentCard,
                animatedStyle,
                style,
            ]}
            onTouchStart={handlePressIn}
            onTouchEnd={handlePressOut}
            onTouchCancel={handlePressOut}
        >
            {children}
        </AnimatedLinearGradient>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: BorderRadius.xl,
        ...Shadows.md,
    },
    accentCard: {
        ...Shadows.accent,
    },
});
