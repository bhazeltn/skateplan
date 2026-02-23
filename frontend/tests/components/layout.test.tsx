import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DashboardLayout from '../../app/dashboard/layout';

// Mock Next.js modules
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Supabase
const mockIsAuthenticated = vi.fn(() => Promise.resolve(true));
const mockSignOut = vi.fn(() => Promise.resolve());
vi.mock('../../app/lib/supabase', () => ({
  isAuthenticated: () => mockIsAuthenticated(),
  signOut: () => mockSignOut(),
}));

// Mock Link component - return string to avoid JSX in mock
vi.mock('next/link', () => ({
  __esModule: true,
  default: () => 'MockedLink',
}));

describe('DashboardLayout', () => {
  it('should render only one navigation element when authorized', async () => {
    mockIsAuthenticated.mockResolvedValueOnce(true);

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    // Wait for auth check to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should only find ONE nav element
    const navElements = document.querySelectorAll('nav');
    expect(navElements.length).toBe(1);
  });

  it('should not render navigation when checking auth', async () => {
    mockIsAuthenticated.mockResolvedValueOnce(false);

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    // While checking auth, should show loading state
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(screen.getByText('Checking authorization...')).toBeInTheDocument();

    const navElements = document.querySelectorAll('nav');
    expect(navElements.length).toBe(0);
  });

  it('should render only one primary navigation (Slot A) - no duplicate headers', async () => {
    mockIsAuthenticated.mockResolvedValueOnce(true);

    render(
      <DashboardLayout>
        <div>Page Content</div>
      </DashboardLayout>
    );

    // Wait for auth check to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify single source of truth for navigation
    const navElements = document.querySelectorAll('nav');
    expect(navElements.length).toBe(1);
  });
});
