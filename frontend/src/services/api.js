const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
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

  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async request(endpoint, config = {}) {
    const { params, skipAuth, ...requestConfig } = config;

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
      throw new Error(error.detail || error.message || `HTTP error! status: ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    return response.json();
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
