/**
 * Tests for AI Coach page component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, userEvent } from '../../testUtils';
import { AICoach } from '../../../pages/AICoach/AICoach';

// Mock the API client
vi.mock('../../../services', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from '../../../services';

describe('AICoach Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders chat interface correctly', () => {
    renderWithProviders(<AICoach />);

    // Use getByRole to target the heading specifically (avoids matching the welcome message)
    expect(screen.getByRole('heading', { name: /AI Financial Coach/i })).toBeInTheDocument();
    // The actual placeholder is "Ask me about your finances..."
    expect(screen.getByPlaceholderText(/ask me about your finances/i)).toBeInTheDocument();
  });

  it('displays welcome message on initial render', () => {
    renderWithProviders(<AICoach />);

    // Should have an initial welcome message from the AI
    expect(screen.getByText(/I'm your AI Financial Coach/i)).toBeInTheDocument();
  });

  it('allows user to type a message', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AICoach />);

    const input = screen.getByPlaceholderText(/ask me about your finances/i);
    await user.type(input, 'How much did I spend?');

    expect(input).toHaveValue('How much did I spend?');
  });

  it('has send button (SendIcon)', () => {
    renderWithProviders(<AICoach />);

    // The send button uses SendIcon and has no text, find by testId
    expect(screen.getByTestId('SendIcon')).toBeInTheDocument();
  });

  it('displays suggestion chips', () => {
    renderWithProviders(<AICoach />);

    // The initial suggestions shown
    expect(screen.getByText('Show my summary')).toBeInTheDocument();
    expect(screen.getByText('How much did I spend?')).toBeInTheDocument();
    expect(screen.getByText('Give me advice')).toBeInTheDocument();
  });

  it('sends message when suggestion chip is clicked', async () => {
    const user = userEvent.setup();
    apiClient.post.mockResolvedValueOnce({
      response: 'You spent $500 this month.',
      intent: 'spending',
      suggestions: ['Show breakdown'],
    });

    renderWithProviders(<AICoach />);

    // Click on a suggestion chip
    const suggestionChip = screen.getByText('How much did I spend?');
    await user.click(suggestionChip);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/ai-coach/chat', {
        message: 'How much did I spend?',
      });
    });
  });

  it('displays AI response after sending message', async () => {
    const user = userEvent.setup();
    apiClient.post.mockResolvedValueOnce({
      response: 'You spent $500 this month on various categories.',
      intent: 'spending',
      suggestions: ['Show breakdown'],
    });

    renderWithProviders(<AICoach />);

    // Click on a suggestion chip to send message
    const suggestionChip = screen.getByText('How much did I spend?');
    await user.click(suggestionChip);

    await waitFor(() => {
      expect(screen.getByText(/\$500/)).toBeInTheDocument();
    });
  });

  it('clears input after sending message', async () => {
    const user = userEvent.setup();
    apiClient.post.mockResolvedValueOnce({
      response: 'Response',
      intent: 'greeting',
      suggestions: [],
    });

    renderWithProviders(<AICoach />);

    const input = screen.getByPlaceholderText(/ask me about your finances/i);
    await user.type(input, 'Hello');

    // Press enter to send
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  it('handles API error gracefully', async () => {
    const user = userEvent.setup();
    apiClient.post.mockRejectedValueOnce(new Error('Network error'));

    renderWithProviders(<AICoach />);

    // Click on a suggestion to trigger an API call
    const suggestionChip = screen.getByText('How much did I spend?');
    await user.click(suggestionChip);

    await waitFor(() => {
      expect(screen.getByText(/sorry|error|trouble/i)).toBeInTheDocument();
    });
  });
});
