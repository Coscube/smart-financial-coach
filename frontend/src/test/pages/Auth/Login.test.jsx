/**
 * Tests for Login page component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, userEvent, mockUser } from '../../testUtils';
import { Login } from '../../../pages/Auth/Login';

// Mock the stores
vi.mock('@stores', () => ({
  useUserStore: vi.fn(() => ({
    setUser: vi.fn(),
    user: null,
    isAuthenticated: false,
  })),
}));

// Mock the API client
vi.mock('@services/api', () => ({
  apiClient: {
    login: vi.fn(),
    get: vi.fn(),
    clearTokens: vi.fn(),
  },
}));

import { apiClient } from '@services/api';
import { useUserStore } from '@stores';

describe('Login Component', () => {
  const mockSetUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useUserStore.mockReturnValue({
      setUser: mockSetUser,
      user: null,
      isAuthenticated: false,
    });
  });

  it('renders login form correctly', () => {
    renderWithProviders(<Login />);

    expect(screen.getByText('Smart Financial Coach')).toBeInTheDocument();
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('allows user to type email and password', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('has password visibility toggle button', () => {
    renderWithProviders(<Login />);

    // Find the visibility icon button by the testId
    const visibilityIcon = screen.getByTestId('VisibilityIcon');
    expect(visibilityIcon).toBeInTheDocument();
  });

  it('submits form and logs in successfully', async () => {
    const user = userEvent.setup();
    apiClient.login.mockResolvedValueOnce({});
    apiClient.get.mockResolvedValueOnce(mockUser);

    renderWithProviders(<Login />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(apiClient.clearTokens).toHaveBeenCalled();
      expect(apiClient.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('displays error message on login failure', async () => {
    const user = userEvent.setup();
    apiClient.login.mockRejectedValueOnce(new Error('Invalid email or password'));

    renderWithProviders(<Login />);

    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
    });
  });

  it('shows loading spinner during login', async () => {
    const user = userEvent.setup();
    // Make login take some time
    apiClient.login.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    renderWithProviders(<Login />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Should show loading spinner
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('has link to signup page', () => {
    renderWithProviders(<Login />);

    const signupLink = screen.getByRole('link', { name: /sign up/i });
    expect(signupLink).toHaveAttribute('href', '/signup');
  });
});
