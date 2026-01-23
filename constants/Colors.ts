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
 * Gradient Definitions - Premium Visual Design
 */
export const Gradients = {
  // Card backgrounds
  warmSurface: ['#F5F2ED', '#FEFBF8'] as const,
  surfaceElevated: ['#FEFBF8', '#F5F2ED', '#EBE8E1'] as const,

  // Accent gradients
  accentWarm: ['#D66D45', '#E88B6A'] as const,
  accentSubtle: ['rgba(214, 109, 69, 0.15)', 'rgba(214, 109, 69, 0.05)'] as const,
  accentGlow: ['rgba(214, 109, 69, 0.3)', 'rgba(214, 109, 69, 0)'] as const,

  // Dark/overlay gradients
  blackOverlay: ['rgba(28, 28, 30, 0)', 'rgba(28, 28, 30, 0.7)'] as const,
  darkElevated: ['#1C1C1E', '#2C2C30'] as const,

  // Shimmer for loaders
  shimmer: ['transparent', 'rgba(255, 255, 255, 0.4)', 'transparent'] as const,

  // Hero sections
  hero: {
    warm: ['#FEFBF8', '#F5F2ED'] as const,
    accent: ['#D66D45', '#C47E5A'] as const,
  },
};

/**
 * Border Radius Scale - More dramatic hierarchy
 */
export const BorderRadius = {
  xs: 8,
  sm: 14,
  md: 18,
  lg: 22,
  xl: 26,
  xxl: 32,
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

/**
 * Shadow Presets - Deeper, more pronounced for WOW
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
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: '#342E25',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#342E25',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  xl: {
    shadowColor: '#342E25',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 16,
  },
  // Colored shadows for accents
  accent: {
    shadowColor: '#D66D45',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
};

/**
 * Typography Scale - More dramatic
 */
export const Typography = {
  display: {
    fontSize: 36,
    fontWeight: '900' as const,
    letterSpacing: -1.5,
    lineHeight: 42,
  },
  h1: {
    fontSize: 32,
    fontWeight: '900' as const,
    letterSpacing: -1,
    lineHeight: 38,
  },
  h2: {
    fontSize: 24,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  h3: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  body: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    lineHeight: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
};

/**
 * Spacing Scale - More generous
 */
export const Spacing = {
  xs: 8,
  sm: 12,
  md: 20,
  lg: 28,
  xl: 36,
  xxl: 48,
};
