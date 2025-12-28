// services/api.ts
const API_URL = import.meta.env.VITE_API_URL || 'https://injazi-backend.onrender.com';

export const api = {
    register: async (data: { email: string; password: string; name: string; country?: string }) => {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) throw result;
        return result;
    },

    login: async (data: { email: string; password: string }) => {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) throw result;
        if (result.token) localStorage.setItem('injazi_token', result.token);
        return result;
    },

    verify: async (email: string, code: string) => {
        const response = await fetch(`${API_URL}/api/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        const result = await response.json();
        if (!response.ok) throw result;
        if (result.token) localStorage.setItem('injazi_token', result.token);
        return result;
    },

    resendCode: async (email: string) => {
        const response = await fetch(`${API_URL}/api/auth/resend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const result = await response.json();
        if (!response.ok) throw result;
        return result;
    },

    forgotPassword: async (email: string) => {
        const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const result = await response.json();
        if (!response.ok) throw result;
        return result;
    },

    resetPassword: async (email: string, code: string, newPassword: string) => {
        const response = await fetch(`${API_URL}/api/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, newPassword })
        });
        const result = await response.json();
        if (!response.ok) throw result;
        return result;
    },

    sync: async (userData: any) => {
        if (!userData.email) return;
        const token = localStorage.getItem('injazi_token');
        await fetch(`${API_URL}/api/sync`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
    },

    getUser: async (email: string) => {
        const response = await fetch(`${API_URL}/api/user/${encodeURIComponent(email)}`);
        const result = await response.json();
        if (!response.ok) throw result;
        return result;
    }
};
