import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchCompetitions, createSkaterEvent } from '@/lib/api';
import type { Competition, SkaterEvent, EventType } from '@/lib/types/models';
import AddEventModal from '@/components/events/AddEventModal';

// Mock API
vi.mock('@/lib/api', () => ({
  searchCompetitions: vi.fn(),
  createSkaterEvent: vi.fn()
}));

describe('AddEventModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call searchCompetitions when typing in the name field', async () => {
    render(
      <AddEventModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        skaterId="skater-123"
      />
    );

    // Get name input (datalist list)
    const nameInput = screen.getByRole<HTMLInputElement>('list', { name: /competition-results/i });

    // Simulate typing "Sun"
    userEvent.type(nameInput, 'Sun');

    // Assert API was called with search term
    expect(searchCompetitions).toHaveBeenCalledWith('Sun');
  });

  it('should display search results as suggestions', async () => {
    // Mock search results
    vi.mocked(searchCompetitions).mockResolvedValue([
      { id: '1', name: 'Sunsational' },
      { id: '2', name: 'Sunnyvale' }
    ]);

    render(
      <AddEventModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        skaterId="skater-123"
      />
    );

    // Get name input (datalist list)
    const nameInput = screen.getByRole<HTMLInputElement>('list', { name: /competition-results/i });

    // Wait for suggestions to appear
    await waitFor(() => {
      const suggestions = screen.getAllByRole('option');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    // Assert "Sunsational" and "Sunnyvale" appear in suggestion list
    expect(screen.getByText('Sunsational')).toBeInTheDocument();
    expect(screen.getByText('Sunnyvale')).toBeInTheDocument();
  });

  it('should auto-fill dates when a competition is selected', async () => {
    // Mock search results
    vi.mocked(searchCompetitions).mockResolvedValue([
      { id: '1', name: 'Sunsational', start_date: '2026-04-17', end_date: '2026-04-19' }
    ]);

    render(
      <AddEventModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        skaterId="skater-123"
      />
    );

    // Get name input (datalist list)
    const nameInput = screen.getByRole<HTMLInputElement>('list', { name: /competition-results/i });

    // Type and select from dropdown
    const eventSelect = screen.getByRole<HTMLSelectElement>('combobox');

    // Select the competition option
    userEvent.type(nameInput, 'Suns');
    await waitFor(() => {
      const suggestions = screen.getAllByRole('option');
      const sunsationalOption = suggestions.find((el: HTMLElement) => el.textContent?.includes('Sunsational'));
      if (sunsationalOption) {
        userEvent.click(sunsationalOption);
      }
    });

    // Assert start and end date inputs are updated
    const startDateInput = screen.getByPlaceholder<HTMLInputElement>(/start date/i);
    const endDateInput = screen.getByPlaceholder<HTMLInputElement>(/end date/i);

    expect(startDateInput).toHaveValue('2026-04-17');
    expect(endDateInput).toHaveValue('2026-04-19');
  });

  it('should call createSkaterEvent on submit', async () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    render(
      <AddEventModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        skaterId="skater-123"
      />
    );

    // Fill form
    const nameInput = screen.getByRole<HTMLInputElement>('list', { name: /competition-results/i });
    userEvent.type(nameInput, 'Test Event');

    const eventSelect = screen.getByRole<HTMLSelectElement>('combobox');
    userEvent.selectOptions(eventSelect, ['SIMULATION']);

    const startDateInput = screen.getByPlaceholder<HTMLInputElement>(/start date/i);
    userEvent.type(startDateInput, '2026-05-15');

    const endDateInput = screen.getByPlaceholder<HTMLInputElement>(/end date/i);
    userEvent.type(endDateInput, '2026-05-15');

    // Click submit button
    const submitButton = screen.getByRole<HTMLButtonElement>('button', { name: /save/i });
    userEvent.click(submitButton);

    // Assert API was called with correct payload
    expect(createSkaterEvent).toHaveBeenCalledWith('skater-123', {
      event_type: 'SIMULATION',
      name: 'Test Event',
      start_date: '2026-05-15',
      end_date: '2026-05-15'
    });

    // Assert onSuccess was called
    expect(mockOnSuccess).toHaveBeenCalled();
  });
});
