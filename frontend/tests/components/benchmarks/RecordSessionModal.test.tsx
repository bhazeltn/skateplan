import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RecordSessionModal, { Metric, Skater, Team } from '../../../app/components/benchmarks/RecordSessionModal';

// Mock modules using vi.hoisted
const { useRouterMock, getAuthTokenMock } = vi.hoisted(() => ({
  useRouterMock: vi.fn(),
  getAuthTokenMock: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: () => useRouterMock
}));

vi.mock('@/lib/supabase', () => ({
  getAuthToken: getAuthTokenMock,
  supabase: { auth: { getSession: vi.fn() } },
  isAuthenticated: vi.fn(),
  signOut: vi.fn()
}));

// Mock fetch
global.fetch = vi.fn();

describe('RecordSessionModal', () => {
  const mockMetrics: Metric[] = [
    {
      id: 'metric-1',
      name: 'Vertical Jump',
      data_type: 'numeric',
      unit: 'inches',
      scale_min: null,
      scale_max: null
    },
    {
      id: 'metric-2',
      name: 'Effort Level',
      data_type: 'scale',
      unit: null,
      scale_min: 1,
      scale_max: 5
    },
    {
      id: 'metric-3',
      name: 'Completed Session',
      data_type: 'boolean',
      unit: null,
      scale_min: null,
      scale_max: null
    }
  ];

  const mockSkaters: Skater[] = [
    { id: 'skater-1', name: 'Alice Johnson' },
    { id: 'skater-2', name: 'Bob Smith' }
  ];

  const mockTeams: Team[] = [
    { id: 'team-1', name: 'Team Rocket' },
    { id: 'team-2', name: 'Team Lightning' }
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    initialMetrics: mockMetrics,
    initialSkaters: mockSkaters,
    initialTeams: mockTeams,
    profileId: 'profile-123'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getAuthTokenMock.mockResolvedValue('fake-token');
  });

  it('renders Date, Notes, and Entity Selector', () => {
    render(<RecordSessionModal {...defaultProps} />);

    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Skater')).toBeInTheDocument();
  });

  it('toggles between Skater/Team radio buttons', () => {
    render(<RecordSessionModal {...defaultProps} />);

    const skaterRadio = screen.getByDisplayValue('skater');
    const teamRadio = screen.getByDisplayValue('team');

    expect(skaterRadio).toBeChecked();
    expect(teamRadio).not.toBeChecked();

    fireEvent.click(teamRadio);

    expect(skaterRadio).not.toBeChecked();
    expect(teamRadio).toBeChecked();
  });

  it('shows the correct entity dropdown options based on the toggle state', () => {
    render(<RecordSessionModal {...defaultProps} />);

    // Initially shows skaters
    expect(screen.getByLabelText('Select Skater')).toBeInTheDocument();
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.queryByText('Team Rocket')).not.toBeInTheDocument();

    // Toggle to team
    fireEvent.click(screen.getByDisplayValue('team'));

    // Now shows teams
    expect(screen.getByLabelText('Select Team')).toBeInTheDocument();
    expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
    expect(screen.getByText('Team Rocket')).toBeInTheDocument();
    expect(screen.getByText('Team Lightning')).toBeInTheDocument();
  });

  it('renders number input for numeric metrics', () => {
    render(<RecordSessionModal {...defaultProps} />);

    const numericLabel = screen.getByText('Vertical Jump');
    expect(numericLabel).toBeInTheDocument();
    expect(screen.getByText('(inches)')).toBeInTheDocument();

    const numericInput = screen.getByPlaceholderText('Enter vertical jump');
    expect(numericInput).toBeInTheDocument();
    expect(numericInput).toHaveAttribute('type', 'number');
  });

  it('renders constrained select for scale metrics', () => {
    render(<RecordSessionModal {...defaultProps} />);

    const scaleLabel = screen.getByText('Effort Level');
    expect(scaleLabel).toBeInTheDocument();
    expect(screen.getByText('(1 - 5)')).toBeInTheDocument();

    const scaleSelect = document.getElementById('metric-metric-2');
    expect(scaleSelect).toBeInTheDocument();
    expect(scaleSelect?.tagName).toBe('SELECT');

    const options = screen.getAllByRole('option');
    // Filter options that are part of the scale select (entity select has its own options)
    const scaleOptions = options.filter(opt => opt.textContent && ['1', '2', '3', '4', '5'].includes(opt.textContent));
    expect(scaleOptions.length).toBe(5);
    expect(scaleOptions[0]).toHaveTextContent('1');
    expect(scaleOptions[4]).toHaveTextContent('5');
  });

  it('renders Yes/No inputs for boolean metrics', () => {
    render(<RecordSessionModal {...defaultProps} />);

    const booleanLabel = screen.getByText('Completed Session');
    expect(booleanLabel).toBeInTheDocument();

    const yesRadio = screen.getByDisplayValue('true');
    const noRadio = screen.getByDisplayValue('false');

    expect(yesRadio).toBeInTheDocument();
    expect(yesRadio).toHaveAttribute('name', 'metric-metric-3');
    expect(noRadio).toBeInTheDocument();
    expect(noRadio).toHaveAttribute('name', 'metric-metric-3');

    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('submits POST to /api/v1/benchmarks/sessions with skater_id successfully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'session-1' })
    });

    render(<RecordSessionModal {...defaultProps} />);

    // Select skater
    fireEvent.change(screen.getByLabelText('Select Skater'), {
      target: { value: 'skater-1' }
    });

    // Fill metrics - numeric
    const numericInput = document.getElementById('metric-metric-1');
    if (numericInput) {
      fireEvent.change(numericInput, { target: { value: '24' } });
    }

    // Fill metrics - scale
    const scaleSelect = document.getElementById('metric-metric-2');
    if (scaleSelect) {
      fireEvent.change(scaleSelect, { target: { value: '4' } });
    }

    // Fill metrics - boolean
    fireEvent.click(screen.getByDisplayValue('true'));

    // Submit
    fireEvent.click(screen.getByText('Record Session'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/benchmarks/sessions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer fake-token',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"skater_id":"skater-1"')
        })
      );
    });
  });

  it('submits POST with team_id when Team is selected', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'session-1' })
    });

    render(<RecordSessionModal {...defaultProps} />);

    // Toggle to team
    fireEvent.click(screen.getByDisplayValue('team'));

    // Select team
    fireEvent.change(screen.getByLabelText('Select Team'), {
      target: { value: 'team-1' }
    });

    // Fill metrics - numeric
    const numericInput = document.getElementById('metric-metric-1');
    if (numericInput) {
      fireEvent.change(numericInput, { target: { value: '24' } });
    }

    // Fill metrics - scale
    const scaleSelect = document.getElementById('metric-metric-2');
    if (scaleSelect) {
      fireEvent.change(scaleSelect, { target: { value: '4' } });
    }

    // Fill metrics - boolean
    fireEvent.click(screen.getByDisplayValue('true'));

    // Submit
    fireEvent.click(screen.getByText('Record Session'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/benchmarks/sessions'),
        expect.objectContaining({
          body: expect.stringContaining('"team_id":"team-1"')
        })
      );
    });
  });

  it('shows validation error when attempting to submit with no entity selected', async () => {
    render(<RecordSessionModal {...defaultProps} />);

    // Don't select an entity, just try to submit
    const form = screen.getByRole('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Please select a skater/i)).toBeInTheDocument();
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows validation error when a metric has no recorded value', async () => {
    render(<RecordSessionModal {...defaultProps} />);

    // Select skater
    fireEvent.change(screen.getByLabelText('Select Skater'), {
      target: { value: 'skater-1' }
    });

    // Don't fill all metrics - only fill one
    const numericInput = document.getElementById('metric-metric-1');
    if (numericInput) {
      fireEvent.change(numericInput, { target: { value: '24' } });
    }

    // Submit
    fireEvent.click(screen.getByText('Record Session'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/Please provide values for all metrics/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
