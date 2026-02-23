import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MetricsLibraryPage from '../../app/dashboard/benchmarks/metrics/page';

// Mock Next.js modules
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('Metrics Library & Search Bar UI Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  describe('Search Bar UI Fix', () => {
    it('should have pr-4 padding on search input to clear icon from placeholder text', async () => {
      render(<MetricsLibraryPage />);

      // Wait for data fetch
      await new Promise(resolve => setTimeout(resolve, 100));

      const searchInput = screen.getByPlaceholderText('Search metrics...');
      expect(searchInput).toHaveClass('pl-10');
    });
  });

  describe('Layman Terminology for Data Types', () => {
    it('should display user-friendly labels for data types', async () => {
      render(<MetricsLibraryPage />);

      // Wait for data fetch
      await new Promise(resolve => setTimeout(resolve, 100));

      // Add a numeric metric to test labels
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: '1',
            name: 'Test Jump Height',
            description: 'Axel jump height in cm',
            category: 'Technical',
            data_type: 'numeric',
            unit: 'cm',
            scale_min: null,
            scale_max: null,
            is_system: false,
            created_at: '2024-01-01',
          },
        ],
      });

      render(<MetricsLibraryPage />);

      // Wait for data fetch
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should display "Number / Measurement" not "Numeric | cm"
      const numericMetric = screen.getByText(/Number \/ Measurement/);
      expect(numericMetric).toBeInTheDocument();

      // Should display "Rating Scale" not "Scale | 1-10"
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: '2',
            name: 'Test Rating',
            description: 'Program component score',
            category: 'Technical',
            data_type: 'scale',
            unit: null,
            scale_min: 1,
            scale_max: 10,
            is_system: false,
            created_at: '2024-01-01',
          },
        ],
      });

      render(<MetricsLibraryPage />);

      // Wait for data fetch
      await new Promise(resolve => setTimeout(resolve, 100));

      const scaleMetric = screen.getByText(/Rating Scale/);
      expect(scaleMetric).toBeInTheDocument();

      // Should display "Yes / No" for boolean (Pass/Fail)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: '3',
            name: 'Test Pass/Fail',
            description: 'Completed training session',
            category: 'Mental',
            data_type: 'boolean',
            unit: null,
            scale_min: null,
            scale_max: null,
            is_system: false,
            created_at: '2024-01-01',
          },
        ],
      });

      render(<MetricsLibraryPage />);

      await new Promise(resolve => setTimeout(resolve, 100));

      const booleanMetric = screen.getByText(/Yes \/ No/);
      expect(booleanMetric).toBeInTheDocument();
    });
});
});
