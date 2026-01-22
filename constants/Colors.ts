/**
 * Flippo Brand Identity - Apple Style
 * Clean White, Soft Greys, Vibrant Accents
 */

const warmBlack = '#1C1C1E';
const warmCream = '#FEFBF8';
const warmSurface = '#F5F2ED'; // A slightly darker cream for cards
const aestheticOrange = '#D66D45'; // Warm Rust/Orange Aesthetic
const mutedGreen = '#5E8057'; // Olive success
const mutedOrange = '#C47E5A'; // Terracotta warning

export const Colors = {
  light: {
    text: warmBlack,
    background: warmCream,
    surface: warmSurface,
    surfaceHighlight: '#E8E4DD',
    primary: warmBlack, // User loves the black buttons
    secondary: warmSurface,
    accent: aestheticOrange, // Updated to Orange
    success: mutedGreen,
    warning: mutedOrange,
    danger: '#D64545', // Slightly desaturated red
    tint: warmBlack,
    icon: '#8F8C85', // Warm Grey Icon
    tabIconDefault: '#BDB9B0',
    tabIconSelected: warmBlack,
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
