// services/ecommerceAgentService.ts

const API_URL = import.meta.env.VITE_API_URL || 'https://injazi-backend.onrender.com';

export interface OrchestratorResponse {
    success: boolean;
    intent: string;
    subAgentRequired: string;
    response: string;
    suggestedActions: {
        title: string;
        description: string;
        priority: 'high' | 'medium' | 'low';
        agentType: string;
    }[];
    requiresUserInput: string[];
    nextSteps: string;
    actionLogId: string;
}

export const ecommerceAgentService = {
    // Master Agent Orchestration
    orchestrate: async (email: string, userMessage: string, context?: any): Promise<OrchestratorResponse> => {
        const response = await fetch(`${API_URL}/api/ecommerce/orchestrate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, userMessage, context })
        });
        if (!response.ok) throw new Error('Orchestration failed');
        return response.json();
    },

    // Shopify Setup
    setupStore: async (email: string, data: {
        storeName: string;
        currency?: string;
        language?: string;
        niche?: string;
    }) => {
        const response = await fetch(`${API_URL}/api/ecommerce/shopify/setup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, ...data })
        });
        if (!response.ok) throw new Error('Store setup failed');
        return response.json();
    },

    // Product Ingestion
    scrapeProducts: async (email: string, productUrls: string[]) => {
        const response = await fetch(`${API_URL}/api/ecommerce/products/scrape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, productUrls })
        });
        if (!response.ok) throw new Error('Product scraping failed');
        return response.json();
    },

    approveProduct: async (email: string, productId: string, finalData: any) => {
        const response = await fetch(`${API_URL}/api/ecommerce/products/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, productId, finalData })
        });
        if (!response.ok) throw new Error('Product approval failed');
        return response.json();
    },

    publishProduct: async (email: string, productId: string) => {
        const response = await fetch(`${API_URL}/api/ecommerce/products/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, productId })
        });
        if (!response.ok) throw new Error('Product publish failed');
        return response.json();
    },

    // Analytics
    getAnalytics: async (email: string, period: 'daily' | 'weekly' | 'monthly' = 'daily') => {
        const response = await fetch(`${API_URL}/api/ecommerce/analytics/${encodeURIComponent(email)}?period=${period}`);
        if (!response.ok) throw new Error('Analytics fetch failed');
        return response.json();
    },

    // Email Marketing
    generateEmail: async (email: string, data: {
        campaignType: 'launch' | 'abandoned_cart' | 'promo' | 'newsletter' | 'welcome' | 'win_back';
        productId?: string;
        customPrompt?: string;
    }) => {
        const response = await fetch(`${API_URL}/api/ecommerce/email/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, ...data })
        });
        if (!response.ok) throw new Error('Email generation failed');
        return response.json();
    },

    approveEmail: async (email: string, draftId: string, scheduledAt?: number) => {
        const response = await fetch(`${API_URL}/api/ecommerce/email/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, draftId, scheduledAt })
        });
        if (!response.ok) throw new Error('Email approval failed');
        return response.json();
    },

    // Social Media
    generateSocialContent: async (email: string, data: {
        platform: 'tiktok' | 'instagram' | 'facebook' | 'youtube';
        contentType: 'post' | 'story' | 'reel' | 'short' | 'video';
        productId?: string;
        customPrompt?: string;
    }) => {
        const response = await fetch(`${API_URL}/api/ecommerce/social/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, ...data })
        });
        if (!response.ok) throw new Error('Social content generation failed');
        return response.json();
    },

    // Action Log
    getActions: async (email: string, status?: string, limit?: number) => {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        if (limit) params.set('limit', limit.toString());
        
        const response = await fetch(`${API_URL}/api/ecommerce/actions/${encodeURIComponent(email)}?${params}`);
        if (!response.ok) throw new Error('Actions fetch failed');
        return response.json();
    },

    approveAction: async (email: string, actionId: string) => {
        const response = await fetch(`${API_URL}/api/ecommerce/actions/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, actionId })
        });
        if (!response.ok) throw new Error('Action approval failed');
        return response.json();
    },

    rejectAction: async (email: string, actionId: string, reason?: string) => {
        const response = await fetch(`${API_URL}/api/ecommerce/actions/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, actionId, reason })
        });
        if (!response.ok) throw new Error('Action rejection failed');
        return response.json();
    },

    // OAuth
    getOAuthUrl: async (platform: string) => {
        const response = await fetch(`${API_URL}/api/ecommerce/oauth/${platform}/url`);
        if (!response.ok) throw new Error('OAuth URL fetch failed');
        return response.json();
    },

    handleOAuthCallback: async (email: string, platform: string, code: string) => {
        const response = await fetch(`${API_URL}/api/ecommerce/oauth/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, platform, code })
        });
        if (!response.ok) throw new Error('OAuth callback failed');
        return response.json();
    }
};
