/**
 * Test utilities and helpers for frontend tests.
 */
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Create a default theme for tests
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

/**
 * Custom render function that wraps components with necessary providers.
 */
export function renderWithProviders(ui, options = {}) {
  const { route = '/', ...renderOptions } = options;

  // Set the initial route
  window.history.pushState({}, 'Test page', route);

  function Wrapper({ children }) {
    return (
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </BrowserRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Mock API client for tests.
 */
export const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  getAuthToken: vi.fn(),
  clearTokens: vi.fn(),
};

/**
 * Mock user data for tests.
 */
export const mockUser = {
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
};

/**
 * Mock transaction data for tests.
 */
export const mockTransactions = [
  {
    id: 1,
    amount: 100.0,
    category: 'food',
    description: 'Groceries',
    transaction_type: 'expense',
    transaction_date: '2026-02-01T12:00:00Z',
  },
  {
    id: 2,
    amount: 5000.0,
    category: 'salary',
    description: 'Monthly salary',
    transaction_type: 'income',
    transaction_date: '2026-02-01T09:00:00Z',
  },
  {
    id: 3,
    amount: 50.0,
    category: 'entertainment',
    description: 'Movie tickets',
    transaction_type: 'expense',
    transaction_date: '2026-01-30T18:00:00Z',
  },
];

/**
 * Mock goal data for tests.
 */
export const mockGoals = [
  {
    id: 1,
    name: 'Emergency Fund',
    target_amount: 10000.0,
    current_amount: 2500.0,
    deadline: '2026-12-31',
    goal_type: 'savings',
  },
  {
    id: 2,
    name: 'Vacation',
    target_amount: 3000.0,
    current_amount: 1500.0,
    deadline: '2026-06-30',
    goal_type: 'savings',
  },
];

/**
 * Mock budget data for tests.
 */
export const mockBudgets = [
  {
    id: 1,
    category: 'food',
    amount: 500.0,
    period: 'monthly',
    spent: 150.0,
  },
  {
    id: 2,
    category: 'entertainment',
    amount: 200.0,
    period: 'monthly',
    spent: 50.0,
  },
];

/**
 * Wait for async operations to complete.
 */
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
