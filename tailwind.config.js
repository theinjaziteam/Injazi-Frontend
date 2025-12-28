/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Theme-aware colors using CSS variables
                primary: 'var(--color-brand-primary)',
                secondary: 'var(--color-brand-secondary)',
                accent: 'var(--color-accent)',
                
                // Background colors
                'bg-primary': 'var(--color-bg-primary)',
                'bg-secondary': 'var(--color-bg-secondary)',
                'bg-card': 'var(--color-bg-card)',
                'bg-surface': 'var(--color-bg-surface)',
                'bg-input': 'var(--color-bg-input)',
                
                // Text colors
                'text-primary': 'var(--color-text-primary)',
                'text-secondary': 'var(--color-text-secondary)',
                'text-muted': 'var(--color-text-muted)',
                'text-inverse': 'var(--color-text-inverse)',
                
                // Semantic colors
                success: 'var(--color-success)',
                warning: 'var(--color-warning)',
                error: 'var(--color-error)',
                
                // Border
                border: 'var(--color-border)',
                'border-strong': 'var(--color-border-strong)',
                
                // Navigation
                'nav-bg': 'var(--color-nav-bg)',
                'nav-text': 'var(--color-nav-text)',
                'nav-text-active': 'var(--color-nav-text-active)',
                'nav-border': 'var(--color-nav-border)',
                
                // Card colors
                'card-bg': 'var(--color-card-bg)',
                'card-border': 'var(--color-card-border)',
                'card-text': 'var(--color-card-text)',
            },
            boxShadow: {
                'sm': 'var(--shadow-sm)',
                'md': 'var(--shadow-md)',
                'lg': 'var(--shadow-lg)',
                'xl': 'var(--shadow-xl)',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                serif: ['Merriweather', 'serif'],
                display: ['Playfair Display', 'serif'],
            },
            animation: {
                'fade-in': 'fade-in 0.3s ease-out',
                'slide-up': 'slide-up 0.4s ease-out',
                'scale-in': 'scale-in 0.2s ease-out',
                'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
            },
        },
    },
    plugins: [],
}
