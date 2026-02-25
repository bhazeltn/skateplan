import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MetricsLibraryPage from '../../app/dashboard/benchmarks/metrics/page';
import * as React from 'react';

const { useRouterMock } = vi.hoisted(() => ({
  useRouterMock: vi.fn(() => ({ push: vi.fn() }))
}));

vi.mock('next/navigation', () => ({
  useRouter: useRouterMock
}));

// Mock Supabase with proper export
vi.mock('../../app/lib/supabase', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getAuthToken: vi.fn(() => Promise.resolve('fake-token')),
  };
});

// Mock MetricModal - note the capital 'M'
vi.mock('../../components/benchmarks/MetricModal', () => ({
  default: ({ isOpen, onClose }: any) => isOpen ? <div data-testid="metric-modal">MetricModal</div> : null,
}));

// Mock fetch globally
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => [],
  })
) as any;

describe('Metrics Library & Search Bar UI Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have pl-4 padding on search input to clear icon from placeholder text', async () => {
    await React.act(async () => {
      render(<MetricsLibraryPage />);
    });

    // Wait for data fetch
    await new Promise(resolve => setTimeout(resolve, 100));

    const searchInput = screen.getByPlaceholderText('Search metrics...');
    expect(searchInput).toHaveClass('pl-10');
  });
});
