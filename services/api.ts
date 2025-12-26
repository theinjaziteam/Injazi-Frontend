import { UserState } from '../types';

const API_URL = 'http://localhost:5000/api';

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
            console.error("Connection Failed:", error);
            throw error;
        }
    },

    // Sync Data (Save to Database)
    async sync(userState: UserState) {
        if(!userState.email) return;
        
        const token = localStorage.getItem('injazi_token');

        try {
            await fetch(`${API_URL}/sync`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // <--- ADDED THIS (Critical for security)
                },
                body: JSON.stringify(userState),
            });
            // console.log("☁️ Synced"); 
        } catch(e) { 
            console.error("Sync Error", e); 
        }
    }
};