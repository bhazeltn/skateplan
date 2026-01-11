import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import RosterPage from '../app/dashboard/roster/page';

// Mock useRouter
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('RosterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('redirects to login if no token', async () => {
    render(<RosterPage />);
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login');
    });
  });

  it('fetches and displays skaters', async () => {
    localStorage.setItem('token', 'fake-jwt');
    const mockSkaters = [
      { id: '1', full_name: 'Skater One', dob: '2010-01-01', level: 'Junior', is_active: true },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSkaters,
    });

    render(<RosterPage />);

    await waitFor(() => {
      expect(screen.getByText('Skater One')).toBeDefined();
      expect(screen.getByText('Junior')).toBeDefined();
    });
  });

  it('opens add skater modal', async () => {
    localStorage.setItem('token', 'fake-jwt');
    (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
    });

    render(<RosterPage />);
    
    await waitFor(() => {
        expect(screen.getByText('+ Add Skater')).toBeDefined();
    });

    fireEvent.click(screen.getByText('+ Add Skater'));
    expect(screen.getByText('Add New Skater')).toBeDefined();
  });
});
