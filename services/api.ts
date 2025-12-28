const API_URL = import.meta.env.VITE_API_URL || 'https://injazi-backend.onrender.com';

console.log('🌐 API URL:', API_URL);

export const api = {
    // ============================================
    // AUTHENTICATION
    // ============================================
    auth: async (data: { 
        email: string; 
        password: string; 
        name?: string; 
        country?: string; 
        isRegister?: boolean 
    }) => {
        try {
            const response = await fetch(`${API_URL}/api/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Authentication failed');
            }
            
            if (result.token) {
                localStorage.setItem('injazi_token', result.token);
            }
            
            return result;
        } catch (error: any) {
            console.error('Auth Error:', error);
            throw new Error(error.message || 'Connection failed. Please try again.');
        }
    },

    // ============================================
    // EMAIL VERIFICATION
    // ============================================
    verifyEmail: async (email: string, code: string) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Verification failed');
            }
            
            return result;
        } catch (error: any) {
            console.error('Verify Email Error:', error);
            throw new Error(error.message || 'Verification failed');
        }
    },

    resendVerification: async (email: string) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to resend code');
            }
            
            return result;
        } catch (error: any) {
            console.error('Resend Verification Error:', error);
            throw new Error(error.message || 'Failed to resend code');
        }
    },

    // ============================================
    // PASSWORD RESET
    // ============================================
    forgotPassword: async (email: string) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Request failed');
            }
            
            return result;
        } catch (error: any) {
            console.error('Forgot Password Error:', error);
            throw new Error(error.message || 'Request failed');
        }
    },

    resetPassword: async (email: string, code: string, newPassword: string) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, newPassword })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Reset failed');
            }
            
            return result;
        } catch (error: any) {
            console.error('Reset Password Error:', error);
            throw new Error(error.message || 'Reset failed');
        }
    },

    // ============================================
    // DATA SYNC
    // ============================================
    sync: async (userState: any) => {
        if (!userState.email) return;
        
        try {
            const token = localStorage.getItem('injazi_token');
            const response = await fetch(`${API_URL}/api/sync`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userState)
            });
            
            if (!response.ok) {
                console.error('Sync failed');
            } else {
                console.log('✅ Synced to server');
            }
        } catch (error) {
            console.error('Sync Error:', error);
        }
    },

    // ============================================
    // USER DATA
    // ============================================
    getUser: async (email: string) => {
        try {
            const response = await fetch(`${API_URL}/api/user/${encodeURIComponent(email)}`);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to get user');
            }
            
            return result;
        } catch (error: any) {
            console.error('Get User Error:', error);
            throw new Error(error.message || 'Failed to get user');
        }
    },

    // ============================================
    // ADGEM OFFERS
    // ============================================
    getAdgemOffers: async (email: string) => {
        try {
            const response = await fetch(`${API_URL}/api/adgem/offers?email=${encodeURIComponent(email)}`);
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('AdGem Offers Error:', error);
            return { offers: [] };
        }
    }
};
