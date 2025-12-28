import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ThemeMode = 'dark' | 'light';

interface ThemeColors {
    // Brand colors (same for both themes)
    primary: string;
    secondary: string;
    accent: string;
    
    // Background colors
    bgPage: string;
    bgCard: string;
    bgCardHover: string;
    bgSurface: string;
    bgInput: string;
    bgItem: string;
    bgItemHover: string;
    
    // Text colors
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textOnCard: string;
    textOnItem: string;
    
    // Border colors
    border: string;
    borderCard: string;
    
    // Shadow
    shadow: string;
    shadowCard: string;
}

interface ThemeContextType {
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
    isLight: boolean;
    isDark: boolean;
    colors: ThemeColors;
}

// Dark mode - Original InJazi colors
const darkTheme: ThemeColors = {
    primary: '#171738',
    secondary: '#3423A6',
    accent: '#DFF3E4',
    
    bgPage: '#171738',
    bgCard: '#1e1e4a',
    bgCardHover: '#252560',
    bgSurface: '#2a2a5c',
    bgInput: '#1e1e4a',
    bgItem: '#252560',
    bgItemHover: '#2d2d6b',
    
    textPrimary: '#FFFFFF',
    textSecondary: '#a5a5c7',
    textMuted: '#6b6b8f',
    textOnCard: '#FFFFFF',
    textOnItem: '#FFFFFF',
    
    border: '#3d3d6b',
    borderCard: '#3d3d6b',
    
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowCard: 'rgba(0, 0, 0, 0.4)',
};

// Light mode - Warm, complementary lighter shades
const lightTheme: ThemeColors = {
    primary: '#171738',      // Keep brand primary
    secondary: '#3423A6',    // Keep brand secondary
    accent: '#DFF3E4',       // Keep brand accent
    
    // Warm cream/ivory backgrounds instead of cold grays
    bgPage: '#FAF9F7',       // Warm off-white
    bgCard: '#FFFFFF',       // Pure white cards
    bgCardHover: '#F5F3F0',  // Warm hover
    bgSurface: '#F0EDE8',    // Warm surface
    bgInput: '#FAF9F7',      // Warm input bg
    bgItem: '#F8F6F3',       // Warm item bg
    bgItemHover: '#F0EDE8',  // Warm item hover
    
    // Rich, readable text colors
    textPrimary: '#1a1a2e',  // Deep navy (not pure black)
    textSecondary: '#4a4a5c', // Warm gray
    textMuted: '#8a8a9c',    // Lighter warm gray
    textOnCard: '#1a1a2e',   // Deep navy on cards
    textOnItem: '#2d2d42',   // Slightly lighter for items
    
    // Warm border colors
    border: '#e8e4df',       // Warm light border
    borderCard: '#e0dcd5',   // Slightly darker for cards
    
    // Softer shadows
    shadow: 'rgba(23, 23, 56, 0.06)',
    shadowCard: 'rgba(23, 23, 56, 0.08)',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem('injazi_theme');
        return (saved as ThemeMode) || 'dark';
    });

    const isLight = mode === 'light';
    const isDark = mode === 'dark';
    const colors = isLight ? lightTheme : darkTheme;

    useEffect(() => {
        localStorage.setItem('injazi_theme', mode);
        
        // Update CSS custom properties for global access
        const root = document.documentElement;
        Object.entries(colors).forEach(([key, value]) => {
            root.style.setProperty(`--color-${key}`, value);
        });
        
        // Update meta theme-color for mobile browsers
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.setAttribute('content', colors.primary);
        }
    }, [mode, colors]);

    const toggleTheme = () => {
        setMode(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return (
        <ThemeContext.Provider value={{ mode, setMode, toggleTheme, isLight, isDark, colors }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
