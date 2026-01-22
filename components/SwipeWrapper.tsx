import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface SwipeWrapperProps {
    children: React.ReactNode;
    leftRoute?: any;
    rightRoute?: any;
}

export function SwipeWrapper({ children, leftRoute, rightRoute }: SwipeWrapperProps) {
    const router = useRouter();
    const translateX = useSharedValue(0);

    const navigate = (route: string) => {
        try {
            router.push(route as any);
        } catch (e) {
            console.warn('Navigation failed', e);
        }
    };

    const pan = Gesture.Pan()
        .activeOffsetX([-20, 20]) // Only activate on horizontal movement
        .onUpdate((event) => {
            // Limit swipe distance for resistance effect if no route
            if (!leftRoute && event.translationX > 0) {
                translateX.value = event.translationX * 0.3;
            } else if (!rightRoute && event.translationX < 0) {
                translateX.value = event.translationX * 0.3;
            } else {
                translateX.value = event.translationX;
            }
        })
        .onEnd((event) => {
            const SWIPE_THRESHOLD = 80; // Distance required to trigger navigation

            if (leftRoute && event.translationX > SWIPE_THRESHOLD) {
                // Swipe Right -> Go Left (Previous Tab)
                runOnJS(navigate)(leftRoute);
            } else if (rightRoute && event.translationX < -SWIPE_THRESHOLD) {
                // Swipe Left -> Go Right (Next Tab)
                runOnJS(navigate)(rightRoute);
            }

            // Spring back to center
            translateX.value = withSpring(0);
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
        flex: 1,
    }));

    return (
        <GestureDetector gesture={pan}>
            <Animated.View style={[styles.container, animatedStyle]}>
                {children}
            </Animated.View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FEFBF8', // Match background to avoid white flashes
    },
});
