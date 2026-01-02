// services/oauthService.ts
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
    category: string;
    icon: string;
    description: string;
    type: 'oauth' | 'api_key';
    configured: boolean;
}

// Category display names and order
export const CATEGORIES = [
    { id: 'all', name: 'All Apps', icon: '🌐' },
    { id: 'ecommerce', name: 'E-commerce', icon: '🛒' },
    { id: 'marketing', name: 'Marketing', icon: '📣' },
    { id: 'social', name: 'Social Media', icon: '📱' },
    { id: 'productivity', name: 'Productivity', icon: '📝' },
    { id: 'health', name: 'Health & Fitness', icon: '💪' },
    { id: 'finance', name: 'Finance', icon: '💰' },
    { id: 'crm', name: 'CRM & Sales', icon: '🤝' },
    { id: 'developer', name: 'Developer', icon: '👨‍💻' },
    { id: 'communication', name: 'Communication', icon: '💬' },
    { id: 'entertainment', name: 'Entertainment', icon: '🎧' },
    { id: 'storage', name: 'Storage', icon: '📁' },
];

export const oauthService = {
    // Get available/configured platforms
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

    // Get ALL platforms (including unconfigured) - for display purposes
    getAllPlatforms: async (): Promise<PlatformInfo[]> => {
        try {
            const response = await fetch(`${API_URL}/api/oauth/platforms/all`);
            const data = await response.json();
            return data.platforms || [];
        } catch (error) {
            console.error('Error fetching all platforms:', error);
            return [];
        }
    },

    // Get OAuth URL
    getAuthUrl: async (platform: string, email: string): Promise<{ success: boolean; url?: string; error?: string; type?: string }> => {
        try {
            const response = await fetch(`${API_URL}/api/oauth/${platform}/url?email=${encodeURIComponent(email)}`);
            const data = await response.json();
            
            if (!response.ok) {
                return { success: false, error: data.error, type: data.type };
            }
            
            return { success: true, url: data.url };
        } catch (error) {
            return { success: false, error: 'Failed to get auth URL' };
        }
    },

    // Connect via OAuth
    connect: async (platform: string, email: string): Promise<boolean> => {
        const result = await oauthService.getAuthUrl(platform, email);
        
        if (result.success && result.url) {
            const width = 600;
            const height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;
            
            window.open(
                result.url,
                `Connect ${platform}`,
                `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
            );
            return true;
        }
        
        return false;
    },

    // Connect Klaviyo with API keys
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
            return { success: false, error: 'Failed to connect Klaviyo' };
        }
    },

    // Get connected accounts
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

    // Check if connected
    isConnected: async (email: string, platform: string): Promise<boolean> => {
        const accounts = await oauthService.getConnectedAccounts(email);
        const account = accounts.find(a => a.platform === platform);
        return account?.isConnected && !account?.isExpired || false;
    },

    // Disconnect
    disconnect: async (email: string, platform: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_URL}/api/oauth/disconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, platform })
            });
            return response.ok;
        } catch (error) {
            console.error('Error disconnecting:', error);
            return false;
        }
    },

    // Refresh token
    refreshToken: async (email: string, platform: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_URL}/api/oauth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, platform })
            });
            return response.ok;
        } catch (error) {
            console.error('Error refreshing:', error);
            return false;
        }
    },

    // Handle OAuth callback
    handleCallback: (): { success: boolean; platform?: string; error?: string } | null => {
        const params = new URLSearchParams(window.location.search);
        const oauth = params.get('oauth');
        const platform = params.get('platform');
        const error = params.get('error');

        if (!oauth) return null;

        window.history.replaceState({}, '', window.location.pathname);

        return {
            success: oauth === 'success',
            platform: platform || undefined,
            error: error || undefined
        };
    }
};

export default oauthService;
