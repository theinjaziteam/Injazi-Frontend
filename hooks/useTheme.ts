// hooks/useTheme.ts
import { useApp } from '../contexts/AppContext';

// Your exact color palette
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
    
    // Status colors
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    
    // Special
    accent: '#A7B0F4',
    overlay: 'rgba(0, 0, 0, 0.5)',
};

const darkColors = {
    // Backgrounds
    bgPrimary: '#000000',       // Black - Main app background
    bgSecondary: '#0a0a14',     // Very dark blue
    bgTertiary: '#141428',      // Dark card bg
    bgAccent: '#1e1e3c',        // Dark accent
    bgAccentStrong: '#A7B0F4',  // Keep accent color
    
    // Text
    textPrimary: '#F9F5EE',     // Creamy White
    textSecondary: '#EDECFB',   // Lavender Haze
    textMuted: '#7D8777',       // Muted Grey
    
    // Cards
    cardBg: '#0a0a14',
    cardBorder: '#1e1e3c',
    
    // Navigation
    navBg: '#000000',
    navActive: '#A7B0F4',
    navInactive: '#7D8777',
    
    // Status colors
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    
    // Special
    accent: '#A7B0F4',
    overlay: 'rgba(0, 0, 0, 0.8)',
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
