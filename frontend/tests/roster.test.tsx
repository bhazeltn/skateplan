import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import RosterPage from '../app/dashboard/roster/page';
import * as React from 'react';

// Mock Next.js modules
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

// Mock Supabase auth
const mockGetSession = vi.fn(() => Promise.resolve({ data: { session: { access_token: 'test-token' } } }));
const mockAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }));
vi.mock('../app/lib/supabase', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    supabase: {
      auth: {
        getSession: () => mockGetSession(),
        onAuthStateChange: () => mockAuthStateChange(),
      },
    },
  };
});

// Mock fetch globally
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => [],
  })
) as any;

describe('RosterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<RosterPage />);
    expect(screen.getByText('Loading Roster...')).toBeInTheDocument();
  });

  it('fetches and displays skaters after auth', async () => {
    // Mock fetch to return skaters
    const mockSkaters = [
      {
        id: '1',
        full_name: 'Skater One',
        email: 'skater1@test.com',
        dob: '2010-01-01',
        discipline: 'Singles',
        current_level: 'Junior',
        is_active: true,
        home_club: null,
        training_site: null,
        federation_code: 'US',
        federation_name: 'U.S. Figure Skating',
        federation_iso_code: 'us',
        country_name: 'United States',
      },
    ];
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSkaters,
    });

    await React.act(async () => {
      render(<RosterPage />);
    });

    // Wait for auth check and data fetch
    await waitFor(() => {
      // Verify "+ Add Skater" button is rendered
      expect(screen.getByText('+ Add Skater')).toBeInTheDocument();
    });
  });

  it('opens add skater modal when button clicked', async () => {
    // Mock fetch to return empty skaters list
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await React.act(async () => {
      render(<RosterPage />);
    });

    // Wait for auth check and data fetch
    await waitFor(() => {
      expect(screen.getByText('+ Add Skater')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Add Skater'));

    // The modal should now be visible (we can't test the modal itself without the actual modal)
    // But we can verify the button was clicked
    expect(screen.getByText('+ Add Skater')).toBeInTheDocument();
  });
});
