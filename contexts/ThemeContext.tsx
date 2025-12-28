import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
    isDark: boolean;
    isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        // Check localStorage first, default to 'dark' (your current theme)
        const saved = localStorage.getItem('injazi_theme');
        if (saved === 'light' || saved === 'dark') {
            return saved;
        }
        // Check system preference as fallback
        if (typeof window !== 'undefined' && window.matchMedia) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            return prefersDark ? 'dark' : 'dark'; // Default to dark for InJazi brand
        }
        return 'dark';
    });

    useEffect(() => {
        // Save to localStorage
        localStorage.setItem('injazi_theme', theme);
        
        // Update document attributes for CSS targeting
        const root = document.documentElement;
        const body = document.body;
        
        // Set data-theme attribute on both html and body
        root.setAttribute('data-theme', theme);
        body.setAttribute('data-theme', theme);
        
        // Update classes for Tailwind/CSS targeting
        if (theme === 'light') {
            root.classList.add('light');
            root.classList.remove('dark');
            body.classList.add('light');
            body.classList.remove('dark');
        } else {
            root.classList.add('dark');
            root.classList.remove('light');
            body.classList.add('dark');
            body.classList.remove('light');
        }
        
        // Update meta theme-color for PWA
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.setAttribute('content', theme === 'dark' ? '#171738' : '#6B5BD2');
        }

        // Update apple-mobile-web-app-status-bar-style
        const metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if (metaStatusBar) {
            metaStatusBar.setAttribute('content', theme === 'dark' ? 'black-translucent' : 'default');
        }
    }, [theme]);

    // Listen for system preference changes
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            // Only auto-switch if user hasn't manually set a preference
            const saved = localStorage.getItem('injazi_theme');
            if (!saved) {
                setThemeState(e.matches ? 'dark' : 'light');
            }
        };
        
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const toggleTheme = () => {
        setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    const value: ThemeContextType = {
        theme,
        toggleTheme,
        setTheme,
        isDark: theme === 'dark',
        isLight: theme === 'light',
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
};
