/**
 * Centralized Animation System - Selly 2026
 * Modern, fluid animations with consistent timing and physics
 */

import { Easing, withSequence, withSpring, withTiming } from 'react-native-reanimated';

/**
 * Spring Physics Configurations
 * Tuned for natural, premium feel
 */
export const SpringConfigs = {
    /** Gentle, smooth spring - for subtle UI changes */
    gentle: {
        damping: 20,
        stiffness: 120,
        mass: 0.5,
    },
    /** Snappy, responsive spring - for buttons and quick interactions */
    snappy: {
        damping: 15,
        stiffness: 200,
        mass: 0.3,
    },
    /** Wobbly, playful spring - for emphasis and delight */
    wobbly: {
        damping: 12,
        stiffness: 150,
        mass: 0.8,
    },
    /** Bouncy spring - for dramatic entrances */
    bouncy: {
        damping: 10,
        stiffness: 100,
        mass: 1,
    },
};

/**
 * Timing Configurations
 * Consistent durations across the app
 */
export const TimingConfigs = {
    /** Quick animations - 150ms */
    quick: {
        duration: 150,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    },
    /** Standard animations - 300ms */
    standard: {
        duration: 300,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
    },
    /** Slow, emphasized animations - 500ms */
    emphasized: {
        duration: 500,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
    },
    /** Smooth, decelerated - for natural endings */
    decelerate: {
        duration: 250,
        easing: Easing.bezier(0, 0, 0.2, 1),
    },
};

/**
 * Animation Presets
 * Ready-to-use animation functions
 */
export const AnimationPresets = {
    /** Fade in animation */
    fadeIn: (duration = 300) => {
        return withTiming(1, { duration, easing: Easing.ease });
    },

    /** Fade out animation */
    fadeOut: (duration = 300) => {
        return withTiming(0, { duration, easing: Easing.ease });
    },

    /** Scale up with spring */
    scaleIn: () => {
        return withSpring(1, SpringConfigs.snappy);
    },

    /** Scale down with spring */
    scaleOut: () => {
        return withSpring(0.95, SpringConfigs.gentle);
    },

    /** Slide up entrance */
    slideUpIn: (distance = 20, duration = 300) => {
        return withTiming(0, { duration, easing: Easing.bezier(0.4, 0, 0.2, 1) });
    },

    /** Bounce entrance effect */
    bounceIn: () => {
        return withSequence(
            withSpring(1.05, { damping: 8, stiffness: 150 }),
            withSpring(1, SpringConfigs.snappy)
        );
    },

    /** Press feedback - subtle scale down */
    pressFeedback: () => {
        return withSpring(0.96, SpringConfigs.snappy);
    },

    /** Release feedback - return to original */
    releaseFeedback: () => {
        return withSpring(1, SpringConfigs.snappy);
    },
};

/**
 * Delay utility for staggered animations
 */
export const staggerDelay = (index: number, baseDelay = 50) => {
    return index * baseDelay;
};

/**
 * Elevation/Shadow animation values
 */
export const ElevationLevels = {
    none: 0,
    low: 2,
    medium: 4,
    high: 8,
    highest: 16,
};

/**
 * Blur values for glassmorphism
 */
export const BlurIntensity = {
    subtle: 10,
    medium: 20,
    strong: 40,
};

/**
 * Common animation sequences
 */
export const AnimationSequences = {
    /** Card entrance: fade + slide up */
    cardEntrance: (delay = 0) => ({
        opacity: withTiming(1, { duration: 400, easing: Easing.ease }),
        transform: [
            { translateY: withTiming(0, { duration: 400, easing: Easing.bezier(0.4, 0, 0.2, 1) }) }
        ],
    }),

    /** Pulse animation for attention */
    pulse: () => withSequence(
        withSpring(1.05, SpringConfigs.gentle),
        withSpring(1, SpringConfigs.gentle)
    ),
};
