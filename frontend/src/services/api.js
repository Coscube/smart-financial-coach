const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  getAuthToken() {
    return localStorage.getItem('access_token');
  }

  setAuthToken(token) {
    localStorage.setItem('access_token', token);
  }

  setRefreshToken(token) {
    localStorage.setItem('refresh_token', token);
  }

  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  }

  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async request(endpoint, config = {}) {
    const { params, skipAuth, isRetry, ...requestConfig } = config;

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    // Add auth token if available and not skipped
    if (!skipAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      ...requestConfig,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));

      // Handle 401 - try to refresh token (only once)
      if (response.status === 401 && !skipAuth && !isRetry) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          // Retry the original request with new token
          return this.request(endpoint, { ...config, isRetry: true });
        }
        // Refresh failed - clear tokens and redirect gracefully
        this.handleAuthFailure();
        throw new Error('Session expired. Please login again.');
      }

      throw new Error(error.detail || error.message || `HTTP error! status: ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async tryRefreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const response = await this.post('/auth/refresh', null, {
          params: { refresh_token: refreshToken },
          skipAuth: true,
          isRetry: true, // Prevent infinite loop
        });
        this.setAuthToken(response.access_token);
        this.setRefreshToken(response.refresh_token);
        return true;
      } catch {
        return false;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  handleAuthFailure() {
    this.clearTokens();
    // Only redirect if not already on auth pages
    const path = window.location.pathname;
    if (!path.includes('/login') && !path.includes('/signup')) {
      window.location.href = '/login';
    }
  }

  async get(endpoint, params, config = {}) {
    return this.request(endpoint, { method: 'GET', params, ...config });
  }

  async post(endpoint, data, config = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  async put(endpoint, data, config = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  async patch(endpoint, data, config = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  async delete(endpoint, config = {}) {
    return this.request(endpoint, { method: 'DELETE', ...config });
  }

  // Auth-specific methods
  async login(email, password) {
    const response = await this.post('/auth/login', { email, password }, { skipAuth: true });
    this.setAuthToken(response.access_token);
    this.setRefreshToken(response.refresh_token);
    return response;
  }

  async register(userData) {
    return this.post('/auth/register', userData, { skipAuth: true });
  }

  async logout() {
    this.clearTokens();
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const response = await this.post('/auth/refresh', null, {
      params: { refresh_token: refreshToken },
      skipAuth: true,
    });
    this.setAuthToken(response.access_token);
    this.setRefreshToken(response.refresh_token);
    return response;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
