import { UserState } from '../types';

// 🌐 Use environment variable for API URL
// Local: http://localhost:5000/api
// Production: https://injazi-backend.onrender.com/api
const API_URL = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api`
    : 'http://localhost:5000/api';

console.log('🌐 API URL configured:', API_URL);

export const api = {
    // Authenticate (Login or Register)
    async auth(data: { email: string; password: string; name?: string; country?: string; isRegister: boolean }) {
        console.log("🚀 Connecting to:", `${API_URL}/auth`);
        
        try {
            const response = await fetch(`${API_URL}/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            
            if (!response.ok) {
                console.error("❌ Server Error:", result);
                throw new Error(result.message || 'Authentication failed');
            }
            
            // Save Token for future requests
            if (result.token) {
                localStorage.setItem('injazi_token', result.token);
            }
            
            console.log("✅ Login Success:", result.user.email);
            return result.user; 
        } catch (error: any) {
            console.error("❌ Connection Failed:", error.message);
            // Provide helpful error message
            if (error.message === 'Failed to fetch') {
                throw new Error(`Cannot connect to backend at ${API_URL}. Please check if the backend is running.`);
            }
            throw error;
        }
    },

    // Sync Data (Save to Database)
    async sync(userState: UserState) {
        if(!userState.email) return;
        
        const token = localStorage.getItem('injazi_token');

        try {
            const response = await fetch(`${API_URL}/sync`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Security: JWT token
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
    }
};
