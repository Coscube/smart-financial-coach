/**
 * Tests for userStore Zustand store.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';

// Mock the API client before importing the store
vi.mock('@services/api', () => ({
  apiClient: {
    login: vi.fn(),
    logout: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    register: vi.fn(),
    getAuthToken: vi.fn(),
    clearTokens: vi.fn(),
  },
}));

import { apiClient } from '@services/api';
import { useUserStore } from '../../stores/userStore';

describe('userStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useUserStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useUserStore.getState();

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should set user and mark as authenticated', () => {
      const mockUser = { id: 1, email: 'test@example.com' };

      act(() => {
        useUserStore.getState().setUser(mockUser);
      });

      const state = useUserStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('login', () => {
    it('should login successfully and set user', async () => {
      const mockUser = { id: 1, email: 'test@example.com', first_name: 'Test' };
      apiClient.login.mockResolvedValueOnce({});
      apiClient.get.mockResolvedValueOnce(mockUser);

      let result;
      await act(async () => {
        result = await useUserStore.getState().login('test@example.com', 'password123');
      });

      expect(result.success).toBe(true);
      expect(apiClient.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(apiClient.get).toHaveBeenCalledWith('/users/me');

      const state = useUserStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should handle login failure', async () => {
      apiClient.login.mockRejectedValueOnce(new Error('Invalid credentials'));

      let result;
      await act(async () => {
        result = await useUserStore.getState().login('wrong@example.com', 'wrongpassword');
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');

      const state = useUserStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid credentials');
    });

    it('should set loading state during login', async () => {
      apiClient.login.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 50)));
      apiClient.get.mockResolvedValueOnce({ id: 1 });

      const loginPromise = useUserStore.getState().login('test@example.com', 'password');

      // Check loading state is set
      expect(useUserStore.getState().isLoading).toBe(true);

      await act(async () => {
        await loginPromise;
      });

      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  describe('register', () => {
    it('should register successfully and set user', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'password123',
        first_name: 'New',
        last_name: 'User',
      };
      const mockUser = { id: 1, ...userData };

      apiClient.register.mockResolvedValueOnce({});
      apiClient.login.mockResolvedValueOnce({});
      apiClient.get.mockResolvedValueOnce(mockUser);

      let result;
      await act(async () => {
        result = await useUserStore.getState().register(userData);
      });

      expect(result.success).toBe(true);
      expect(apiClient.register).toHaveBeenCalledWith(userData);

      const state = useUserStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle registration failure', async () => {
      apiClient.register.mockRejectedValueOnce(new Error('Email already exists'));

      let result;
      await act(async () => {
        result = await useUserStore.getState().register({
          email: 'exists@example.com',
          password: 'password',
        });
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already exists');
    });
  });

  describe('logout', () => {
    it('should clear user and authentication state', () => {
      // First set a user
      act(() => {
        useUserStore.setState({
          user: { id: 1, email: 'test@example.com' },
          isAuthenticated: true,
        });
      });

      act(() => {
        useUserStore.getState().logout();
      });

      const state = useUserStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(apiClient.logout).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updates = { first_name: 'Updated' };
      const updatedUser = { id: 1, email: 'test@example.com', first_name: 'Updated' };

      // Set initial user
      act(() => {
        useUserStore.setState({
          user: { id: 1, email: 'test@example.com', first_name: 'Original' },
          isAuthenticated: true,
        });
      });

      apiClient.put.mockResolvedValueOnce(updatedUser);

      let result;
      await act(async () => {
        result = await useUserStore.getState().updateProfile(updates);
      });

      expect(result.success).toBe(true);
      expect(apiClient.put).toHaveBeenCalledWith('/users/me', updates);

      const state = useUserStore.getState();
      expect(state.user.first_name).toBe('Updated');
    });

    it('should handle profile update failure', async () => {
      apiClient.put.mockRejectedValueOnce(new Error('Update failed'));

      let result;
      await act(async () => {
        result = await useUserStore.getState().updateProfile({ first_name: 'New' });
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('checkAuth', () => {
    it('should return false if no token', async () => {
      apiClient.getAuthToken.mockReturnValueOnce(null);

      let result;
      await act(async () => {
        result = await useUserStore.getState().checkAuth();
      });

      expect(result).toBe(false);
      expect(useUserStore.getState().isAuthenticated).toBe(false);
    });

    it('should verify token and set user if valid', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      apiClient.getAuthToken.mockReturnValueOnce('valid-token');
      apiClient.get.mockResolvedValueOnce(mockUser);

      let result;
      await act(async () => {
        result = await useUserStore.getState().checkAuth();
      });

      expect(result).toBe(true);
      expect(useUserStore.getState().user).toEqual(mockUser);
      expect(useUserStore.getState().isAuthenticated).toBe(true);
    });

    it('should clear tokens if verification fails', async () => {
      apiClient.getAuthToken.mockReturnValueOnce('invalid-token');
      apiClient.get.mockRejectedValueOnce(new Error('Unauthorized'));

      let result;
      await act(async () => {
        result = await useUserStore.getState().checkAuth();
      });

      expect(result).toBe(false);
      expect(apiClient.clearTokens).toHaveBeenCalled();
      expect(useUserStore.getState().isAuthenticated).toBe(false);
    });
  });
});
