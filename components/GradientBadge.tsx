/**
 * GradientBadge - Premium badge with gradient background
 */

import { BorderRadius, Gradients } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';

interface GradientBadgeProps {
    label: string;
    colors?: readonly [string, string, ...string[]];
    textStyle?: TextStyle;
    style?: ViewStyle;
    variant?: 'accent' | 'dark' | 'subtle';
}

export const GradientBadge: React.FC<GradientBadgeProps> = ({
    label,
    colors,
    textStyle,
    style,
    variant = 'accent',
}) => {
    const getGradientColors = () => {
        if (colors) return colors;
        switch (variant) {
            case 'dark':
                return Gradients.darkElevated;
            case 'subtle':
                return Gradients.accentSubtle;
            default:
                return Gradients.accentWarm;
        }
    };

    const getTextColor = () => {
        return variant === 'dark' || variant === 'accent' ? '#FFFFFF' : '#D66D45';
    };

    return (
        <LinearGradient
            colors={getGradientColors()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.badge, style]}
        >
            <Text style={[styles.badgeText, { color: getTextColor() }, textStyle]}>
                {label}
            </Text>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BorderRadius.sm,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
});
