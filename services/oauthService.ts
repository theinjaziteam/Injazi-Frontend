// services/oauthService.ts
// Frontend OAuth service for connecting apps

const API_URL = import.meta.env.VITE_API_URL || 'https://injazi-backend.onrender.com';

export interface ConnectedAccount {
    platform: string;
    platformUsername?: string;
    platformEmail?: string;
    isConnected: boolean;
    connectedAt?: number;
    expiresAt?: number;
    isExpired?: boolean;
}

export interface PlatformInfo {
    id: string;
    name: string;
    configured: boolean;
}

export const oauthService = {
    /**
     * Get list of available OAuth platforms
     */
    getAvailablePlatforms: async (): Promise<PlatformInfo[]> => {
        try {
            const response = await fetch(`${API_URL}/api/oauth/platforms`);
            const data = await response.json();
            return data.platforms || [];
        } catch (error) {
            console.error('Error fetching platforms:', error);
            return [];
        }
    },

    /**
     * Get OAuth URL for a platform
     */
    getAuthUrl: async (platform: string, email: string, additionalParams?: Record<string, string>): Promise<string | null> => {
        try {
            const params = new URLSearchParams({ email, ...additionalParams });
            const response = await fetch(`${API_URL}/api/oauth/${platform}/url?${params}`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error);
            }
            
            return data.url;
        } catch (error) {
            console.error(`Error getting auth URL for ${platform}:`, error);
            return null;
        }
    },

    /**
     * Connect to a platform (opens OAuth popup/redirect)
     */
    connect: async (platform: string, email: string, usePopup: boolean = true): Promise<boolean> => {
        const url = await oauthService.getAuthUrl(platform, email);
        
        if (!url) {
            return false;
        }

        if (usePopup) {
            // Open in popup
            const width = 600;
            const height = 700;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            
            const popup = window.open(
                url,
                `oauth_${platform}`,
                `width=${width},height=${height},left=${left},top=${top},popup=1`
            );

            if (!popup) {
                // Popup blocked, fall back to redirect
                window.location.href = url;
                return true;
            }

            // Return promise that resolves when popup closes or auth completes
            return new Promise((resolve) => {
                const checkPopup = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkPopup);
                        // Check if connected successfully
                        oauthService.isConnected(email, platform).then(resolve);
                    }
                }, 500);

                // Also listen for message from popup
                window.addEventListener('message', function handler(event) {
                    if (event.data?.type === 'oauth_complete' && event.data?.platform === platform) {
                        clearInterval(checkPopup);
                        window.removeEventListener('message', handler);
                        resolve(event.data.success);
                    }
                });
            });
        } else {
            // Redirect to OAuth URL
            window.location.href = url;
            return true;
        }
    },

    /**
     * Get user's connected accounts
     */
    getConnectedAccounts: async (email: string): Promise<ConnectedAccount[]> => {
        try {
            const response = await fetch(`${API_URL}/api/oauth/connected/${encodeURIComponent(email)}`);
            const data = await response.json();
            return data.accounts || [];
        } catch (error) {
            console.error('Error fetching connected accounts:', error);
            return [];
        }
    },

    /**
     * Check if a specific platform is connected
     */
    isConnected: async (email: string, platform: string): Promise<boolean> => {
        const accounts = await oauthService.getConnectedAccounts(email);
        const account = accounts.find(a => a.platform === platform);
        return account?.isConnected && !account?.isExpired || false;
    },

    /**
     * Disconnect a platform
     */
    disconnect: async (email: string, platform: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_URL}/api/oauth/disconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, platform })
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error(`Error disconnecting ${platform}:`, error);
            return false;
        }
    },

    /**
     * Refresh token for a platform
     */
    refreshToken: async (email: string, platform: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_URL}/api/oauth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, platform })
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error(`Error refreshing token for ${platform}:`, error);
            return false;
        }
    },

    /**
     * Handle OAuth callback result (call this after redirect back)
     */
    handleCallback: (): { success: boolean; platform?: string; error?: string } | null => {
        const params = new URLSearchParams(window.location.search);
        const oauth = params.get('oauth');
        const platform = params.get('platform');
        const error = params.get('error');

        if (!oauth) {
            return null;
        }

        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);

        return {
            success: oauth === 'success',
            platform: platform || undefined,
            error: error || undefined
        };
    }
};

// ============================================
// PLATFORM CATEGORIES FOR UI
// ============================================

export const PLATFORM_CATEGORIES = {
    'E-commerce': ['shopify'],
    'Email Marketing': ['klaviyo', 'mailchimp'],
    'Social Media': ['tiktok', 'meta', 'twitter', 'pinterest', 'linkedin'],
    'Video & Content': ['google', 'spotify'],
    'Productivity': ['notion', 'slack', 'discord', 'trello', 'asana', 'todoist'],
    'Fitness & Health': ['fitbit', 'strava', 'withings', 'oura', 'whoop', 'google_fit'],
    'Finance & Payments': ['stripe', 'paypal', 'quickbooks', 'xero', 'coinbase'],
    'CRM & Sales': ['hubspot', 'salesforce'],
    'Other': ['github', 'amazon', 'dropbox', 'zoom', 'calendly']
};

export const PLATFORM_ICONS: Record<string, string> = {
    shopify: '🛒',
    klaviyo: '📧',
    mailchimp: '🐵',
    tiktok: '🎵',
    meta: '📘',
    google: '🔍',
    youtube: '📺',
    twitter: '🐦',
    pinterest: '📌',
    linkedin: '💼',
    spotify: '🎧',
    notion: '📝',
    slack: '💬',
    discord: '🎮',
    stripe: '💳',
    paypal: '💰',
    github: '🐙',
    trello: '📋',
    asana: '✅',
    todoist: '☑️',
    fitbit: '⌚',
    strava: '🚴',
    withings: '⚖️',
    oura: '💍',
    whoop: '🏋️',
    google_fit: '❤️',
    amazon: '📦',
    dropbox: '📁',
    zoom: '📹',
    calendly: '📅',
    hubspot: '🧲',
    salesforce: '☁️',
    quickbooks: '📊',
    xero: '📈',
    coinbase: '₿'
};

export default oauthService;
