// services/api.ts
// API Configuration for InJazi Frontend

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

console.log('🌐 API URL:', API_URL); // Debug log

export const api = {
  // Authentication endpoints
  auth: {
    register: async (email: string, password: string, name: string) => {
      try {
        const response = await fetch(`${API_URL}/api/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'register',
            email,
            password,
            name
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Registration failed');
        }

        return await response.json();
      } catch (error) {
        console.error('❌ Registration error:', error);
        throw error;
      }
    },

    login: async (email: string, password: string) => {
      try {
        const response = await fetch(`${API_URL}/api/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'login',
            email,
            password
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Login failed');
        }

        return await response.json();
      } catch (error) {
        console.error('❌ Login error:', error);
        throw error;
      }
    }
  },

  // User data sync
  user: {
    sync: async (email: string, updates: any, token?: string) => {
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        // Add auth token if provided
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/api/sync`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            email,
            updates
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Sync failed');
        }

        return await response.json();
      } catch (error) {
        console.error('❌ Sync error:', error);
        throw error;
      }
    }
  },

  // Health check
  health: async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      return await response.json();
    } catch (error) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  }
};

// Export API_URL for debugging
export { API_URL };
