import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { apiClient } from '@services/api';

export const useUserStore = create(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        setUser: (user) => set({ user, isAuthenticated: true, error: null }),
        
        setLoading: (isLoading) => set({ isLoading }),
        
        setError: (error) => set({ error }),

        login: async (email, password) => {
          set({ isLoading: true, error: null });
          try {
            await apiClient.login(email, password);
            const user = await apiClient.get('/users/me');
            set({ user, isAuthenticated: true, isLoading: false });
            return { success: true };
          } catch (error) {
            set({ isLoading: false, error: error.message });
            return { success: false, error: error.message };
          }
        },

        register: async (userData) => {
          set({ isLoading: true, error: null });
          try {
            await apiClient.register(userData);
            await apiClient.login(userData.email, userData.password);
            const user = await apiClient.get('/users/me');
            set({ user, isAuthenticated: true, isLoading: false });
            return { success: true };
          } catch (error) {
            set({ isLoading: false, error: error.message });
            return { success: false, error: error.message };
          }
        },

        logout: () => {
          apiClient.logout();
          set({ user: null, isAuthenticated: false, error: null });
        },

        updateProfile: async (updates) => {
          set({ isLoading: true, error: null });
          try {
            const updatedUser = await apiClient.put('/users/me', updates);
            set({ user: updatedUser, isLoading: false });
            return { success: true };
          } catch (error) {
            set({ isLoading: false, error: error.message });
            return { success: false, error: error.message };
          }
        },

        checkAuth: async () => {
          const token = apiClient.getAuthToken();
          if (!token) {
            set({ user: null, isAuthenticated: false });
            return false;
          }
          try {
            const user = await apiClient.get('/users/me');
            set({ user, isAuthenticated: true });
            return true;
          } catch {
            apiClient.clearTokens();
            set({ user: null, isAuthenticated: false });
            return false;
          }
        },
      }),
      {
        name: 'user-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    )
  )
);
