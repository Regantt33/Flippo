/**
 * PremiumButton - Modern Interactive Button Component
 * Features: Spring animations, haptic feedback, multiple variants
 */

import { SpringConfigs } from '@/utils/animations';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

interface PremiumButtonProps {
    onPress?: () => void;
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    disabled?: boolean;
    hapticFeedback?: boolean;
    variant?: 'default' | 'primary' | 'ghost';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PremiumButton: React.FC<PremiumButtonProps> = ({
    onPress,
    children,
    style,
    disabled = false,
    hapticFeedback = true,
    variant = 'default',
}) => {
    const scale = useSharedValue(1);
    const elevation = useSharedValue(0);

    const handlePressIn = () => {
        scale.value = withSpring(0.96, { damping: 12, stiffness: 200 });
        elevation.value = withSpring(2, { damping: 15, stiffness: 100 });

        if (hapticFeedback && !disabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, SpringConfigs.snappy);
        elevation.value = withSpring(0, SpringConfigs.gentle);
    };

    const handlePress = () => {
        if (!disabled && onPress) {
            if (hapticFeedback) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            onPress();
        }
    };

    const animatedStyle = useAnimatedStyle(() => {
        const shadowOpacity = interpolate(
            elevation.value,
            [0, 2],
            [0, 0.1]
        );

        return {
            transform: [{ scale: scale.value }],
            shadowOpacity,
            shadowOffset: {
                width: 0,
                height: elevation.value,
            },
            shadowRadius: elevation.value * 2,
            elevation: elevation.value,
        };
    });

    return (
        <AnimatedPressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[
                styles.base,
                animatedStyle,
                style,
                disabled && styles.disabled,
            ]}
        >
            {children}
        </AnimatedPressable>
    );
};

const styles = StyleSheet.create({
    base: {
        // Minimum touch target for accessibility
        minHeight: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabled: {
        opacity: 0.4,
    },
});
