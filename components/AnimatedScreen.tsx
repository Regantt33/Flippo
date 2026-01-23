import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface AnimatedScreenProps {
    children: React.ReactNode;
}

/**
 * Wraps a tab screen with smooth fade + slide entrance animation.
 * Provides a modern, fluid transition experience for 2026.
 */
export function AnimatedScreen({ children }: AnimatedScreenProps) {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(15);

    useEffect(() => {
        // Smooth fade in
        opacity.value = withTiming(1, {
            duration: 400,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
        });

        // Gentle slide up
        translateY.value = withSpring(0, {
            damping: 20,
            stiffness: 150,
            mass: 0.5,
        });
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        flex: 1,
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <Animated.View style={animatedStyle}>
            {children}
        </Animated.View>
    );
}

const styles = StyleSheet.create({});
