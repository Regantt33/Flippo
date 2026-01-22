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
        .activeOffsetX([-15, 15]) // More sensitive horizontal detection
        .failOffsetY([-15, 15]) // Prevent conflicts with vertical scrolling
        .onUpdate((event) => {
            // Limit swipe distance for resistance effect if no route
            if (!leftRoute && event.translationX > 0) {
                translateX.value = event.translationX * 0.15; // Increased resistance (was 0.2)
            } else if (!rightRoute && event.translationX < 0) {
                translateX.value = event.translationX * 0.15; // Increased resistance (was 0.2)
            } else {
                translateX.value = event.translationX;
            }
        })
        .onEnd((event) => {
            const SWIPE_THRESHOLD = 70; // Slightly lower threshold for easier navigation
            const velocity = event.velocityX;

            // Consider velocity for more natural feel
            // Fast swipe = easier to trigger navigation
            const velocityBoost = Math.abs(velocity) > 500 ? 20 : 0;
            const effectiveDistance = Math.abs(event.translationX) + velocityBoost;

            if (leftRoute && event.translationX > 0 && effectiveDistance > SWIPE_THRESHOLD) {
                // Swipe Right -> Go Left (Previous Tab)
                runOnJS(navigate)(leftRoute);
            } else if (rightRoute && event.translationX < 0 && effectiveDistance > SWIPE_THRESHOLD) {
                // Swipe Left -> Go Right (Next Tab)
                runOnJS(navigate)(rightRoute);
            }

            // Much slower, controlled spring animation
            translateX.value = withSpring(0, {
                damping: 20,         // Balanced damping
                stiffness: 120,      // MUCH slower response
                mass: 1,
                overshootClamping: true,  // PREVENT OVERSHOOT (Critical for stability)
                velocity: velocity < 2000 ? velocity : 0, // Cap velocity
            });
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
