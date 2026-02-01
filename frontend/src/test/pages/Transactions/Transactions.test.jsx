/**
 * Tests for Transactions page component.
 *
 * These tests verify core functionality of the Transactions page
 * while being flexible about implementation details.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, userEvent, mockTransactions } from '../../testUtils';
import { Transactions } from '../../../pages/Transactions/Transactions';

// Mock the API client
vi.mock('../../../services', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from '../../../services';

describe('Transactions Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for fetching transactions
    apiClient.get.mockImplementation((url) => {
      if (url === '/transactions') {
        return Promise.resolve(mockTransactions);
      }
      if (url === '/categories') {
        return Promise.resolve([
          { name: 'food' },
          { name: 'entertainment' },
          { name: 'transport' },
        ]);
      }
      return Promise.resolve([]);
    });
  });

  it('renders transactions page with title', () => {
    renderWithProviders(<Transactions />);

    // The page should show "Transactions" text
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  it('fetches and displays transactions', async () => {
    renderWithProviders(<Transactions />);

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument();
    });

    expect(screen.getByText('Monthly salary')).toBeInTheDocument();
    expect(screen.getByText('Movie tickets')).toBeInTheDocument();
  });

  it('displays Add Transaction button', () => {
    renderWithProviders(<Transactions />);

    expect(screen.getByRole('button', { name: /add transaction/i })).toBeInTheDocument();
  });

  it('displays Upload Excel button', () => {
    renderWithProviders(<Transactions />);

    expect(screen.getByRole('button', { name: /upload excel/i })).toBeInTheDocument();
  });

  it('opens add transaction dialog when button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Transactions />);

    const addButton = screen.getByRole('button', { name: /add transaction/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('has filter buttons for transaction type', () => {
    renderWithProviders(<Transactions />);

    expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /expense/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /income/i })).toBeInTheDocument();
  });

  it('has search input', () => {
    renderWithProviders(<Transactions />);

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('filters transactions by search term', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Transactions />);

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'Movie');

    // Should filter to show only matching transactions
    await waitFor(() => {
      expect(screen.getByText('Movie tickets')).toBeInTheDocument();
      expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
    });
  });

  it('can filter to show only income transactions', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Transactions />);

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument();
    });

    // Click income filter
    const incomeFilter = screen.getByRole('button', { name: /income/i });
    await user.click(incomeFilter);

    await waitFor(() => {
      expect(screen.getByText('Monthly salary')).toBeInTheDocument();
      expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
    });
  });

  it('calls API get on mount', () => {
    renderWithProviders(<Transactions />);

    expect(apiClient.get).toHaveBeenCalled();
  });

  // Edit Transaction Tests
  describe('Edit Transaction', () => {
    it('opens edit dialog when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Transactions />);

      // Wait for transactions to load
      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });

      // Find and click the edit button for the first transaction
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      // Dialog should open with "Edit" in the title
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('pre-fills form with transaction data when editing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Transactions />);

      // Wait for transactions to load
      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });

      // Click edit on the first transaction (Groceries - $100)
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Check that the amount field is pre-filled
      const amountInput = screen.getByRole('spinbutton', { name: /amount/i });
      expect(amountInput).toHaveValue(100);
    });

    it('calls API put when updating a transaction', async () => {
      const user = userEvent.setup();
      apiClient.put.mockResolvedValue({
        id: 1,
        amount: 150,
        category: 'food',
        description: 'Updated Groceries',
      });

      renderWithProviders(<Transactions />);

      // Wait for transactions to load
      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });

      // Click edit button
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Find the Update button and click it
      const updateButton = screen.getByRole('button', { name: /update/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalled();
      });
    });

    it('shows Update button instead of Add when editing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Transactions />);

      // Wait for transactions to load
      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });

      // Click edit button
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Should show "Update" button, not "Add"
      expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^add$/i })).not.toBeInTheDocument();
    });
  });

  // Delete Transaction Tests
  describe('Delete Transaction', () => {
    it('opens delete confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Transactions />);

      // Wait for transactions to load
      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });

      // Find and click the delete button for the first transaction
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Confirmation dialog should open
      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });
    });

    it('shows transaction details in delete confirmation dialog', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Transactions />);

      // Wait for transactions to load
      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Should show "Amount:" label with the value in confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/Amount:/)).toBeInTheDocument();
      });
    });

    it('closes delete confirmation when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Transactions />);

      // Wait for transactions to load
      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Confirmation dialog should close
      await waitFor(() => {
        expect(screen.queryByText(/are you sure you want to delete/i)).not.toBeInTheDocument();
      });
    });

    it('calls API delete when delete is confirmed', async () => {
      const user = userEvent.setup();
      apiClient.delete.mockResolvedValue(null);

      renderWithProviders(<Transactions />);

      // Wait for transactions to load
      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });

      // Click the delete confirm button
      const confirmDeleteButton = screen
        .getAllByRole('button', { name: /delete/i })
        .find(
          (btn) =>
            btn.textContent.toLowerCase() === 'delete' ||
            btn.textContent.toLowerCase() === 'deleting...'
        );
      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(apiClient.delete).toHaveBeenCalledWith('/transactions/1');
      });
    });

    it('refreshes transaction list after successful delete', async () => {
      const user = userEvent.setup();
      apiClient.delete.mockResolvedValue(null);

      // After delete, return fewer transactions
      let callCount = 0;
      apiClient.get.mockImplementation((url) => {
        if (url === '/transactions') {
          callCount++;
          if (callCount > 1) {
            // After delete, return only 2 transactions
            return Promise.resolve(mockTransactions.slice(1));
          }
          return Promise.resolve(mockTransactions);
        }
        if (url === '/categories') {
          return Promise.resolve([
            { name: 'food' },
            { name: 'entertainment' },
            { name: 'transport' },
          ]);
        }
        return Promise.resolve([]);
      });

      renderWithProviders(<Transactions />);

      // Wait for transactions to load
      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });

      // Confirm delete
      const confirmDeleteButton = screen
        .getAllByRole('button', { name: /delete/i })
        .find(
          (btn) =>
            btn.textContent.toLowerCase() === 'delete' ||
            btn.textContent.toLowerCase() === 'deleting...'
        );
      await user.click(confirmDeleteButton);

      // API get should be called again to refresh the list
      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(4); // Initial load (2x for transactions and categories) + refresh after delete
      });
    });
  });
});
