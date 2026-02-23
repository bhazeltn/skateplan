import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RosterPage from '../../app/dashboard/roster/page';

// Mock Next.js modules
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Supabase
const mockGetSession = vi.fn(() => Promise.resolve({ data: { session: { access_token: 'test-token' } } }));
const mockAuthStateChange = vi.fn();
vi.mock('../../app/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

// Mock modals
vi.mock('../../app/dashboard/roster/add-skater-modal', () => ({
  default: ({ isOpen, onClose }: any) => isOpen ? <div data-testid="add-skater-modal">AddSkaterModal</div> : null,
}));
vi.mock('../../app/dashboard/roster/add-team-modal', () => ({
  default: ({ isOpen, onClose }: any) => isOpen ? <div data-testid="add-team-modal">AddTeamModal</div> : null,
}));
vi.mock('../../components/EditSkaterModal', () => ({
  default: ({ isOpen, onClose }: any) => isOpen ? <div data-testid="edit-skater-modal">EditSkaterModal</div> : null,
}));
vi.mock('../../components/EditTeamModal', () => ({
  default: ({ isOpen, onClose }: any) => isOpen ? <div data-testid="edit-team-modal">EditTeamModal</div> : null,
}));

// Mock FederationFlag
vi.mock('../../components/FederationFlag', () => ({
  FederationFlag: ({ iso_code, size }: any) => <span data-testid={`flag-${iso_code}`}>🇵🇭</span>,
}));

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

  it('should render only one main content area (no duplicate header)', async () => {
    render(<RosterPage />);

    // Wait for auth check and data fetch
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify NO nav elements are rendered by the page itself
    const navElements = screen.getAllByRole('navigation');
    // Should be 0 nav elements from page itself (layout handles nav)
    expect(navElements.length).toBe(0);
  });

  it('should render skater table with proper structure', async () => {
    render(<RosterPage />);

    // Wait for auth check and data fetch
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify table headers exist
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Federation/Country')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('Discipline')).toBeInTheDocument();
    expect(screen.getByText('Level')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('should render "No skaters found" message when empty', async () => {
    // Mock empty response
    (global.fetch as any).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => [],
      })
    );

    render(<RosterPage />);

    // Wait for auth check and data fetch
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(screen.getByText('No skaters found.')).toBeInTheDocument();
  });

  it('should display federation flag component for skaters with iso_code', async () => {
    // Mock skater with PH iso code (Philippines)
    const mockSkater = {
      id: '123',
      full_name: 'Isabella',
      email: 'test@example.com',
      dob: '2010-01-01',
      discipline: 'Ladies',
      current_level: 'Junior',
      is_active: true,
      home_club: null,
      training_site: null,
      federation_code: 'PH',
      federation_name: 'Philippine Skating Union',
      federation_iso_code: 'PH',
      country_name: 'Philippines',
    };

    (global.fetch as any).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => [mockSkater],
      })
    );

    render(<RosterPage />);

    // Wait for auth check and data fetch
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify flag component is rendered for Philippines
    const flagElement = screen.getByTestId('flag-PH');
    expect(flagElement).toBeInTheDocument();
    expect(flagElement).toHaveTextContent('🇵🇭');
  });
});
