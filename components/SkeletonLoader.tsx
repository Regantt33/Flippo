/**
 * SkeletonLoader - Modern Loading Placeholder with Shimmer
 * Features: Smooth shimmer animation, configurable shapes
 */

import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

interface SkeletonLoaderProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle | ViewStyle[];
    variant?: 'rect' | 'circle' | 'text';
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 12,
    style,
    variant = 'rect',
}) => {
    const shimmerTranslate = useSharedValue(-1);

    useEffect(() => {
        shimmerTranslate.value = withRepeat(
            withTiming(1, {
                duration: 1500,
                easing: Easing.bezier(0.4, 0, 0.6, 1),
            }),
            -1,
            false
        );
    }, []);

    const shimmerStyle = useAnimatedStyle(() => {
        const translateX = interpolate(
            shimmerTranslate.value,
            [-1, 1],
            [-300, 300]
        );

        return {
            transform: [{ translateX }],
        };
    });

    const getShape = (): ViewStyle => {
        if (variant === 'circle') {
            return {
                width: height,
                height: height,
                borderRadius: height / 2,
            };
        }
        return {
            width: typeof width === 'number' ? width : undefined,
            height,
            borderRadius,
        };
    };

    return (
        <View style={[styles.container, getShape(), style]}>
            <Animated.View style={[styles.shimmer, shimmerStyle]}>
                <LinearGradient
                    colors={[
                        Colors.light.surface,
                        Colors.light.surfaceHighlight,
                        Colors.light.surface,
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradient}
                />
            </Animated.View>
        </View>
    );
};

// Skeleton Variants for common patterns
export const SkeletonCard = () => (
    <View style={styles.cardSkeleton}>
        <SkeletonLoader width={72} height={72} borderRadius={16} />
        <View style={styles.cardContent}>
            <SkeletonLoader width="80%" height={18} borderRadius={8} />
            <SkeletonLoader width="40%" height={14} borderRadius={8} style={{ marginTop: 8 }} />
        </View>
    </View>
);

export const SkeletonList = ({ count = 3 }: { count?: number }) => (
    <View style={styles.listSkeleton}>
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
        ))}
    </View>
);

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.light.surface,
        overflow: 'hidden',
    },
    shimmer: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        width: 300,
        height: '100%',
    },
    cardSkeleton: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: Colors.light.background,
        borderRadius: 24,
        marginBottom: 12,
    },
    cardContent: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    listSkeleton: {
        padding: 24,
    },
});
