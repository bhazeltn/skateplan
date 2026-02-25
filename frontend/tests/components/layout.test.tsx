import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardLayout from '../../app/dashboard/layout';
import * as React from 'react';

// Mock Next.js modules
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Supabase with hoisting
const { mockIsAuthenticated, mockSignOut } = vi.hoisted(() => ({
  mockIsAuthenticated: vi.fn(() => Promise.resolve(true)),
  mockSignOut: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../app/lib/supabase', () => ({
  isAuthenticated: mockIsAuthenticated,
  signOut: mockSignOut,
}));

// Mock Link component - return string to avoid JSX in mock
vi.mock('next/link', () => ({
  __esModule: true,
  default: () => 'MockedLink',
}));

describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('should render only one navigation element when authorized', async () => {
    mockIsAuthenticated.mockResolvedValueOnce(true);

    await React.act(async () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      );
    });

    // Wait for auth check to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should only find ONE nav element
    const navElements = document.querySelectorAll('nav');
    expect(navElements.length).toBe(1);
  });

  it('should not render navigation or children when not authenticated', async () => {
    // Mock auth as false - unauthorized user (use mockReturnValue for all calls)
    mockIsAuthenticated.mockReturnValue(Promise.resolve(false));

    await React.act(async () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      );
    });

    // Wait for auth check to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Children should NOT be rendered when unauthorized
    const checkingEl = screen.queryByText('Test Content');
    expect(checkingEl).not.toBeInTheDocument();

    // Navigation should NOT be rendered when unauthorized
    const navElements = document.querySelectorAll('nav');
    expect(navElements.length).toBe(0);

    // Router should have redirected to login
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('should render only one primary navigation (Slot A) - no duplicate headers', async () => {
    mockIsAuthenticated.mockResolvedValueOnce(true);

    await React.act(async () => {
      render(
        <DashboardLayout>
          <div>Page Content</div>
        </DashboardLayout>
      );
    });

    // Wait for auth check to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify single source of truth for navigation
    const navElements = document.querySelectorAll('nav');
    expect(navElements.length).toBe(1);
  });
});
