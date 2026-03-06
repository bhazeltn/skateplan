import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddEventModal from '@/components/events/AddEventModal';
import { searchCompetitions, createSkaterEvent } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  searchCompetitions: vi.fn().mockResolvedValue([]),
  createSkaterEvent: vi.fn()
}));

describe('AddEventModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call searchCompetitions when typing in the name field', async () => {
    render(<AddEventModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} skaterId="skater-123" />);
    const nameInput = screen.getByRole('combobox', { name: /event name/i });
    fireEvent.change(nameInput, { target: { value: 'Sun' } });

    await waitFor(() => {
      expect(searchCompetitions).toHaveBeenCalledWith('Sun');
    });
  });

  it('should display search results as suggestions', async () => {
    vi.mocked(searchCompetitions).mockResolvedValue([{ id: '1', name: 'Sunsational', start_date: '2026-04-17', end_date: '2026-04-19', is_peak_event: false } as any]);
    render(<AddEventModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} skaterId="skater-123" />);
    const nameInput = screen.getByRole('combobox', { name: /event name/i });
    fireEvent.change(nameInput, { target: { value: 'Sunsational' } });

    await waitFor(() => {
      const option = document.querySelector('option[value="Sunsational"]');
      expect(option).toBeInTheDocument();
    });
  });

  it('should auto-fill dates when a competition is selected', async () => {
    vi.mocked(searchCompetitions).mockResolvedValue([{ id: '1', name: 'Sunsational', start_date: '2026-04-17', end_date: '2026-04-19', is_peak_event: false } as any]);
    render(<AddEventModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} skaterId="skater-123" />);
    const nameInput = screen.getByRole('combobox', { name: /event name/i });
    fireEvent.change(nameInput, { target: { value: 'Sunsational' } });

    await waitFor(() => {
      expect(screen.getByLabelText(/start date/i)).toHaveValue('2026-04-17');
      expect(screen.getByLabelText(/end date/i)).toHaveValue('2026-04-19');
    });
  });

  it('should call createSkaterEvent on submit', async () => {
    render(<AddEventModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} skaterId="skater-123" />);

    fireEvent.change(screen.getByRole('combobox', { name: /event name/i }), { target: { value: 'Test Event' } });
    fireEvent.change(screen.getByLabelText(/event type/i), { target: { value: 'SIMULATION' } });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-05-15' } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2026-05-15' } });

    fireEvent.click(screen.getByRole('button', { name: /save event/i }));

    await waitFor(() => {
      expect(createSkaterEvent).toHaveBeenCalledWith('skater-123', expect.objectContaining({
        name: 'Test Event',
        event_type: 'SIMULATION',
        start_date: '2026-05-15',
        end_date: '2026-05-15'
      }));
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
