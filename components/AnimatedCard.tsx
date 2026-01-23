/**
 * AnimatedCard - Modern Card Component with Entrance Animations
 * Features: Staggered entrance, glassmorphism, press feedback
 */

import { SpringConfigs } from '@/utils/animations';
import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface AnimatedCardProps {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    delay?: number;
    enableGlass?: boolean;
    onPress?: () => void;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
    children,
    style,
    delay = 0,
    enableGlass = false,
    onPress,
}) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);
    const scale = useSharedValue(1);

    useEffect(() => {
        // Entrance animation
        opacity.value = withDelay(
            delay,
            withTiming(1, {
                duration: 400,
                easing: Easing.bezier(0.4, 0, 0.2, 1),
            })
        );

        translateY.value = withDelay(
            delay,
            withTiming(0, {
                duration: 500,
                easing: Easing.bezier(0.4, 0, 0.2, 1),
            })
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    const handlePressIn = () => {
        if (onPress) {
            scale.value = withSpring(0.98, SpringConfigs.snappy);
        }
    };

    const handlePressOut = () => {
        if (onPress) {
            scale.value = withSpring(1, SpringConfigs.snappy);
        }
    };

    const content = (
        <Animated.View
            style={[
                styles.card,
                enableGlass && styles.glass,
                animatedStyle,
                style,
            ]}
        >
            {children}
        </Animated.View>
    );

    if (onPress) {
        return (
            <Animated.View
                onTouchStart={handlePressIn}
                onTouchEnd={handlePressOut}
                style={animatedStyle}
            >
                {content}
            </Animated.View>
        );
    }

    return content;
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'transparent',
    },
    glass: {
        // Glassmorphism effect (requires BlurView overlay in parent)
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
});
