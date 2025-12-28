// hooks/useTheme.ts
import { useApp } from '../contexts/AppContext';

// LIGHT MODE - Your new color palette
const lightColors = {
    // Backgrounds
    bgPrimary: '#F9F5EE',       // Creamy White - Main app background
    bgSecondary: '#EDECFB',     // Lavender Haze - Header/sections
    bgTertiary: '#D6DCFB',      // Sky Blue Tint - Cards hover
    bgAccent: '#C3CEFD',        // Periwinkle Light - Highlights
    bgAccentStrong: '#A7B0F4',  // Soft Indigo Accent - Active/buttons
    
    // Text
    textPrimary: '#000000',     // Black - Main text
    textSecondary: '#3B4777',   // Dark Indigo Text - Secondary text
    textMuted: '#7D8777',       // Muted Grey Text - Hints/placeholders
    
    // Cards
    cardBg: '#FFFFFF',
    cardBorder: '#EDECFB',
    
    // Navigation
    navBg: '#F9F5EE',
    navActive: '#3B4777',
    navInactive: '#7D8777',
    
    // Header (for gradient areas)
    headerBg: '#EDECFB',
    headerText: '#000000',
    
    // Status colors
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    
    // Special
    accent: '#A7B0F4',
    accentText: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
    
    // Progress ring
    progressTrack: '#D6DCFB',
    progressFill: '#A7B0F4',
    
    // Earn credits
    earnBg: '#fbbf24',        // amber-400
    earnText: '#78350f',      // amber-900
};

// DARK MODE - Your OLD/existing colors
const darkColors = {
    // Backgrounds (old dark purple theme)
    bgPrimary: '#171738',       // Space Indigo - Main app background
    bgSecondary: '#171738',     // Same for header
    bgTertiary: '#232350',      // Slightly lighter for cards
    bgAccent: '#3423A6',        // Vivid Royal - Highlights
    bgAccentStrong: '#3423A6',  // Vivid Royal - Active/buttons
    
    // Text
    textPrimary: '#FFFFFF',     // White - Main text
    textSecondary: '#DFF3E4',   // Honeydew - Secondary text
    textMuted: '#7180B9',       // Glaucous - Hints/placeholders
    
    // Cards
    cardBg: '#1e1e42',          // Dark card background
    cardBorder: '#2a2a5a',      // Dark border
    
    // Navigation
    navBg: '#171738',
    navActive: '#DFF3E4',       // Honeydew for active
    navInactive: '#7180B9',     // Glaucous for inactive
    
    // Header
    headerBg: '#171738',
    headerText: '#FFFFFF',
    
    // Status colors
    success: '#DFF3E4',         // Honeydew
    warning: '#f59e0b',
    error: '#ef4444',
    
    // Special
    accent: '#DFF3E4',          // Honeydew accent
    accentText: '#171738',      // Dark text on accent
    overlay: 'rgba(0, 0, 0, 0.7)',
    
    // Progress ring
    progressTrack: 'rgba(255,255,255,0.1)',
    progressFill: '#DFF3E4',    // Honeydew
    
    // Earn credits
    earnBg: '#fbbf24',
    earnText: '#78350f',
};

export type ThemeColors = typeof lightColors;

export const useTheme = () => {
    const { theme, toggleTheme } = useApp();
    const colors = theme === 'light' ? lightColors : darkColors;
    
    return {
        colors,
        mode: theme,
        toggle: toggleTheme,
        isLight: theme === 'light',
        isDark: theme === 'dark',
    };
};
