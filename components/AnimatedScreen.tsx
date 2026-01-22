import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface AnimatedScreenProps {
    children: React.ReactNode;
}

/**
 * Wraps a tab screen with smooth fade-in animation when focused.
 * Provides a modern, fluid transition experience.
 */
export function AnimatedScreen({ children }: AnimatedScreenProps) {
    const opacity = useSharedValue(1);

    // Animate only on mount to prevent flickering on re-focus
    React.useEffect(() => {
        opacity.value = 0;
        opacity.value = withTiming(1, {
            duration: 300, // Slightly longer for initial load satisfaction
        });
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        flex: 1,
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={animatedStyle}>
            {children}
        </Animated.View>
    );
}

const styles = StyleSheet.create({});
