// services/oauthService.ts
// Frontend OAuth service for connecting apps

const API_URL = import.meta.env.VITE_API_URL || 'https://injazi-backend.onrender.com';

export interface ConnectedAccount {
    platform: string;
    platformUsername?: string;
    platformEmail?: string;
    platformAvatar?: string;
    isConnected: boolean;
    connectedAt?: number;
    expiresAt?: number;
    isExpired?: boolean;
    type?: 'oauth' | 'api_key';
}

export interface PlatformInfo {
    id: string;
    name: string;
    type: 'oauth' | 'api_key';
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
    getAuthUrl: async (platform: string, email: string, additionalParams?: Record<string, string>): Promise<{ success: boolean; url?: string; error?: string; type?: string }> => {
        try {
            const params = new URLSearchParams({ email, ...additionalParams });
            const response = await fetch(`${API_URL}/api/oauth/${platform}/url?${params}`);
            const data = await response.json();
            
            if (!response.ok || !data.success) {
                return { 
                    success: false, 
                    error: data.error,
                    type: data.type 
                };
            }
            
            return { success: true, url: data.url };
        } catch (error) {
            console.error(`Error getting auth URL for ${platform}:`, error);
            return { success: false, error: 'Failed to get auth URL' };
        }
    },

    /**
     * Connect to an OAuth platform (opens popup/redirect)
     */
    connect: async (platform: string, email: string, usePopup: boolean = true): Promise<boolean> => {
        const result = await oauthService.getAuthUrl(platform, email);
        
        if (!result.success) {
            if (result.type === 'api_key') {
                console.log(`${platform} uses API keys, not OAuth`);
                return false;
            }
            console.error('OAuth error:', result.error);
            return false;
        }

        if (!result.url) {
            return false;
        }

        if (usePopup) {
            // Open in popup
            const width = 600;
            const height = 700;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            
            const popup = window.open(
                result.url,
                `oauth_${platform}`,
                `width=${width},height=${height},left=${left},top=${top},popup=1`
            );

            if (!popup) {
                // Popup blocked, fall back to redirect
                window.location.href = result.url;
                return true;
            }

            // Return promise that resolves when popup closes
            return new Promise((resolve) => {
                const checkPopup = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkPopup);
                        // Check if connected successfully after a short delay
                        setTimeout(async () => {
                            const connected = await oauthService.isConnected(email, platform);
                            resolve(connected);
                        }, 1000);
                    }
                }, 500);

                // Timeout after 5 minutes
                setTimeout(() => {
                    clearInterval(checkPopup);
                    resolve(false);
                }, 5 * 60 * 1000);
            });
        } else {
            // Redirect to OAuth URL
            window.location.href = result.url;
            return true;
        }
    },

    /**
     * Connect Klaviyo using API keys
     */
    connectKlaviyo: async (email: string, apiKey?: string, publicKey?: string): Promise<{ success: boolean; error?: string; account?: any }> => {
        try {
            const response = await fetch(`${API_URL}/api/oauth/klaviyo/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, apiKey, publicKey })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                return { success: false, error: data.error };
            }
            
            return { success: true, account: data.account };
        } catch (error) {
            console.error('Klaviyo connection error:', error);
            return { success: false, error: 'Failed to connect Klaviyo' };
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
        return (account?.isConnected && !account?.isExpired) || false;
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
// PLATFORM METADATA FOR UI
// ============================================

export const PLATFORM_INFO: Record<string, {
    name: string;
    icon: string;
    color: string;
    description: string;
    category: 'ecommerce' | 'social' | 'productivity' | 'health' | 'developer' | 'marketing' | 'finance';
}> = {
    shopify: { name: 'Shopify', icon: '🛒', color: '#96bf48', description: 'E-commerce platform', category: 'ecommerce' },
    klaviyo: { name: 'Klaviyo', icon: '📧', color: '#000000', description: 'Email marketing', category: 'marketing' },
    google: { name: 'Google', icon: '🔍', color: '#4285f4', description: 'YouTube & Analytics', category: 'marketing' },
    tiktok: { name: 'TikTok', icon: '🎵', color: '#000000', description: 'Short-form video', category: 'social' },
    meta: { name: 'Meta', icon: '📘', color: '#1877f2', description: 'Facebook & Instagram', category: 'social' },
    twitter: { name: 'Twitter/X', icon: '🐦', color: '#1da1f2', description: 'Social media', category: 'social' },
    spotify: { name: 'Spotify', icon: '🎧', color: '#1db954', description: 'Music streaming', category: 'social' },
    github: { name: 'GitHub', icon: '💻', color: '#333333', description: 'Code repository', category: 'developer' },
    discord: { name: 'Discord', icon: '💬', color: '#5865f2', description: 'Community chat', category: 'social' },
    notion: { name: 'Notion', icon: '📝', color: '#000000', description: 'Notes & docs', category: 'productivity' },
    slack: { name: 'Slack', icon: '💼', color: '#4a154b', description: 'Team communication', category: 'productivity' },
    fitbit: { name: 'Fitbit', icon: '⌚', color: '#00b0b9', description: 'Fitness tracking', category: 'health' },
    strava: { name: 'Strava', icon: '🚴', color: '#fc4c02', description: 'Activity tracking', category: 'health' },
    stripe: { name: 'Stripe', icon: '💳', color: '#635bff', description: 'Payments', category: 'finance' },
};

export const PLATFORM_CATEGORIES = {
    'E-commerce': ['shopify'],
    'Marketing': ['klaviyo', 'google'],
    'Social Media': ['tiktok', 'meta', 'twitter', 'spotify', 'discord'],
    'Productivity': ['notion', 'slack'],
    'Health & Fitness': ['fitbit', 'strava'],
    'Developer': ['github'],
    'Finance': ['stripe']
};

export default oauthService;
