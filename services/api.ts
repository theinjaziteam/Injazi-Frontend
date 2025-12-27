import { UserState } from '../types';

// ✅ FIXED: Remove duplicate /api
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || 'Authentication failed');
            }

            const result = await response.json();
            if (result.token) {
                localStorage.setItem('injazi_token', result.token);
            }
            
            console.log("✅ Login Success:", result.user.email);
            return result.user; 
        } catch (error: any) {
            console.error("❌ Connection Failed:", error.message);
            if (error.message === 'Failed to fetch') {
                throw new Error(`Backend may be sleeping. Wait 60 seconds and try again.`);
            }
            throw error;
        }
    },

    async sync(userState: UserState) {
        if(!userState.email) return;
        const token = localStorage.getItem('injazi_token');

        try {
            await fetch(`${API_URL}/api/sync`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userState),
            });
            console.log("☁️ Data synced");
        } catch(e) { 
            console.error("❌ Sync Error:", e); 
        }
    }
};
