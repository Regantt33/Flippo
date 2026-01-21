/**
 * Flippo Brand Identity - Apple Style
 * Clean White, Soft Greys, Vibrant Accents
 */

const flippoBlue = '#007AFF'; // Apple System Blue
const flippoGreen = '#34C759'; // Apple System Green
const flippoOrange = '#FF9500'; // Apple System Orange

export const Colors = {
  light: {
    text: '#000000',
    // Updated to Cream Theme
    background: '#FEFBF8', // The new "White" (Uniform Cream)
    surface: '#FEFBF8', // The new "White"
    surfaceHighlight: '#E5E5EA',
    primary: flippoBlue,
    secondary: flippoOrange,
    success: flippoGreen,
    warning: flippoOrange,
    danger: '#FF3B30',
    tint: flippoBlue,
    icon: '#8E8E93',
    tabIconDefault: '#8E8E93',
    tabIconSelected: flippoBlue,
  },
  dark: {
    // Keeping dark mode just in case, but mapped to Apple Dark System
    text: '#FFFFFF',
    background: '#000000',
    surface: '#1C1C1E',
    surfaceHighlight: '#2C2C2E',
    primary: '#0A84FF',
    secondary: '#FF9F0A',
    success: '#30D158',
    warning: '#FF9F0A',
    danger: '#FF453A',
    tint: '#0A84FF',
    icon: '#8E8E93',
    tabIconDefault: '#8E8E93',
    tabIconSelected: '#0A84FF',
  },
};
