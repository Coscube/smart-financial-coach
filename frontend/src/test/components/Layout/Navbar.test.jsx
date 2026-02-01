/**
 * Tests for Navbar component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent } from '../../testUtils';
import { Navbar } from '../../../components/Layout/Navbar';

// Mock the stores
vi.mock('@stores', () => ({
  useUserStore: vi.fn(() => ({
    user: {
      id: 1,
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
    },
    logout: vi.fn(),
  })),
}));

import { useUserStore } from '@stores';

describe('Navbar Component', () => {
  const mockOnMenuClick = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useUserStore.mockReturnValue({
      user: {
        id: 1,
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
      },
      logout: mockLogout,
    });
  });

  it('renders app title', () => {
    renderWithProviders(<Navbar drawerWidth={240} onMenuClick={mockOnMenuClick} />);

    expect(screen.getByText('Smart Financial Coach')).toBeInTheDocument();
  });

  it('displays user name', () => {
    renderWithProviders(<Navbar drawerWidth={240} onMenuClick={mockOnMenuClick} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('displays user initials in avatar', () => {
    renderWithProviders(<Navbar drawerWidth={240} onMenuClick={mockOnMenuClick} />);

    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('opens user menu when avatar is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Navbar drawerWidth={240} onMenuClick={mockOnMenuClick} />);

    const avatarButton = screen.getByText('JD').closest('button');
    await user.click(avatarButton);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows logout option in menu', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Navbar drawerWidth={240} onMenuClick={mockOnMenuClick} />);

    const avatarButton = screen.getByText('JD').closest('button');
    await user.click(avatarButton);

    expect(screen.getByText(/logout/i)).toBeInTheDocument();
  });

  it('shows settings option in menu', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Navbar drawerWidth={240} onMenuClick={mockOnMenuClick} />);

    const avatarButton = screen.getByText('JD').closest('button');
    await user.click(avatarButton);

    expect(screen.getByText(/settings/i)).toBeInTheDocument();
  });

  it('calls logout when logout is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Navbar drawerWidth={240} onMenuClick={mockOnMenuClick} />);

    const avatarButton = screen.getByText('JD').closest('button');
    await user.click(avatarButton);

    const logoutOption = screen.getByText(/logout/i);
    await user.click(logoutOption);

    expect(mockLogout).toHaveBeenCalled();
  });

  it('handles user without name gracefully', () => {
    useUserStore.mockReturnValue({
      user: {
        id: 1,
        email: 'test@example.com',
      },
      logout: mockLogout,
    });

    renderWithProviders(<Navbar drawerWidth={240} onMenuClick={mockOnMenuClick} />);

    // Should show fallback initial 'U'
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('handles null user gracefully', () => {
    useUserStore.mockReturnValue({
      user: null,
      logout: mockLogout,
    });

    renderWithProviders(<Navbar drawerWidth={240} onMenuClick={mockOnMenuClick} />);

    // Should show fallback initial 'U'
    expect(screen.getByText('U')).toBeInTheDocument();
  });
});
