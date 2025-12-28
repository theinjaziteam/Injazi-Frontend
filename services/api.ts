import { UserState } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'https://injazi-backend.onrender.com';

console.log('🌐 API URL configured:', API_URL);

export const api = {
    async auth(data: { email: string; password: string; name?: string; country?: string; isRegister: boolean }) {
        console.log("🚀 Connecting to:", `${API_URL}/api/auth`);
        
        try {
            const response = await fetch(`${API_URL}/api/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            
            if (!response.ok) {
                console.error("❌ Server Error:", result);
                throw new Error(result.message || 'Authentication failed');
            }
            
            if (result.token) {
                localStorage.setItem('injazi_token', result.token);
            }
            
            console.log("✅ Login Success:", result.user.email);
            return result.user; 
        } catch (error: any) {
            console.error("❌ Connection Failed:", error.message);
            if (error.message === 'Failed to fetch') {
                throw new Error(`Cannot connect to backend. Please check if the backend is running.`);
            }
            throw error;
        }
    },

    async sync(userState: UserState) {
        if(!userState.email) return;
        
        const token = localStorage.getItem('injazi_token');

        try {
            const response = await fetch(`${API_URL}/api/sync`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userState),
            });

            if (!response.ok) {
                console.error("❌ Sync failed:", response.status);
            } else {
                console.log("☁️ Data synced successfully");
            }
        } catch(e) { 
            console.error("❌ Sync Error:", e); 
        }
    },

    async getAdgemOffers(email: string) {
        try {
            console.log("📡 Fetching AdGem offers...");
            const response = await fetch(`${API_URL}/api/adgem/offers?email=${encodeURIComponent(email)}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch offers');
            }
            
            const data = await response.json();
            console.log(`✅ Fetched ${data.offers?.length || 0} offers`);
            return data;
        } catch (error) {
            console.error('❌ Error fetching AdGem offers:', error);
            return { status: 'error', offers: [] };
        }
    }
};
