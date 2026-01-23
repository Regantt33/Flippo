/**
 * Flippo Brand Identity - Apple Style
 * Clean White, Soft Greys, Vibrant Accents
 * Enhanced for 2026 with glassmorphism and modern shadows
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

/**
 * Shadow Presets - Modern, layered shadows
 */
export const Shadows = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#342E25',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#342E25',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#342E25',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#342E25',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
};

/**
 * Opacity Variants - For glassmorphism effects
 */
export const Opacity = {
  glass: {
    background: 'rgba(254, 251, 248, 0.85)',
    surface: 'rgba(245, 242, 237, 0.9)',
    overlay: 'rgba(28, 28, 30, 0.4)',
    strong: 'rgba(28, 28, 30, 0.75)',
  },
  subtle: {
    border: 'rgba(28, 28, 30, 0.08)',
    divider: 'rgba(28, 28, 30, 0.06)',
  },
};

/**
 * Gradient Definitions - Subtle depth
 */
export const Gradients = {
  warmSurface: [warmSurface, '#EBE8E1'],
  accentSubtle: [aestheticOrange + '20', aestheticOrange + '05'],
  blackOverlay: ['transparent', 'rgba(28, 28, 30, 0.6)'],
};

/**
 * Border Radius Scale - Modern hierarchy
 */
export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  full: 9999,
};

/**
 * Blur Intensity - For backdrop effects
 */
export const BlurIntensity = {
  subtle: 10,
  medium: 20,
  strong: 40,
};
