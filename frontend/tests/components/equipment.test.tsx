import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock getAuthToken from supabase
const mockGetAuthToken = vi.fn(() => Promise.resolve('test-token'));

vi.mock('../../app/lib/supabase', () => ({
  getAuthToken: () => mockGetAuthToken(),
}));

// Mock components - simplified versions for tests
vi.mock('../../app/components/EquipmentList', () => ({
  default: ({ equipment, onAdd }: any) => (
    <div data-testid="equipment-list">
      {equipment?.length === 0 && <div data-testid="empty-state">No equipment found</div>}
      {equipment?.map((eq: any) => (
        <div key={eq.id} data-testid={`equipment-${eq.id}`} data-name={eq.name} data-type={eq.type}>
          {eq.name || `${eq.type} - ${eq.brand} ${eq.model}`}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../../app/components/AddEquipmentModal', () => ({
  default: ({ isOpen, onClose, onSuccess, skaterId }: any) => isOpen ? (
    <div data-testid="add-equipment-modal">
      <form data-testid="add-equipment-form">
        <label>Equipment Type</label>
        <input type="radio" name="type" value="boot" data-testid="type-boot" />
        <input type="radio" name="type" value="blade" data-testid="type-blade" />
        <label>Name (optional)</label>
        <input type="text" name="name" data-testid="name-input" />
        <label>Brand</label>
        <input type="text" name="brand" data-testid="brand-input" />
        <label>Model</label>
        <input type="text" name="model" data-testid="model-input" />
        <label>Size</label>
        <input type="text" name="size" data-testid="size-input" />
        <label>Purchase Date</label>
        <input type="date" name="purchase_date" data-testid="purchase-date-input" />
        <label>Active</label>
        <input type="checkbox" name="is_active" defaultChecked data-testid="is-active-input" />
      </form>
    </div>
  ) : null,
}));

vi.mock('../../app/components/MaintenanceModal', () => ({
  default: ({ isOpen, onClose, onSuccess, equipmentId, equipment }: any) => isOpen ? (
    <div data-testid="maintenance-modal">
      <div data-testid="maintenance-header">
        Maintenance: {equipment?.name || equipment?.brand} {equipment?.model}
      </div>
      <div data-testid="maintenance-list">
        {equipment?.maintenance_logs?.map((log: any) => (
          <div key={log.id} data-testid={`maintenance-${log.id}`} data-date={log.date} data-type={log.maintenance_type}>
            {log.date} - {log.maintenance_type} - {log.location}
          </div>
        ))}
        {(!equipment?.maintenance_logs || equipment?.maintenance_logs?.length === 0) && (
          <div data-testid="no-maintenance">No maintenance records</div>
        )}
      </div>
      <form data-testid="maintenance-form">
        <label>Date</label>
        <input type="date" name="maintenance-date-input" />
        <label>Type</label>
        <select name="maintenance_type" data-testid="maintenance-type-select">
          <option value="sharpening">Sharpening</option>
          <option value="mounting">Mounting</option>
          <option value="waterproofing">Waterproofing</option>
          <option value="repair">Repair</option>
          <option value="replacement">Replacement</option>
          <option value="other">Other</option>
        </select>
        <label>Location</label>
        <input type="text" name="location-input" />
        <label>Technician (optional)</label>
        <input type="text" name="technician-input" />
        <label>Specifications (optional)</label>
        <textarea name="specifications-input" />
        <label>Notes (optional)</label>
        <textarea name="notes-input" />
      </form>
    </div>
  ) : null,
}));

import EquipmentList from '../../app/components/EquipmentList';
import AddEquipmentModal from '../../app/components/AddEquipmentModal';
import MaintenanceModal from '../../app/components/MaintenanceModal';

// Global fetch mock
const mockFetch = vi.fn() as any;
global.fetch = mockFetch;

describe('Equipment Module - EquipmentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthToken.mockResolvedValue('test-token');
  });

  it('should render a list of mock equipment', () => {
    const mockEquipment = [
      {
        id: 'eq-1',
        skater_id: 'skater-1',
        name: 'Freeskate Boots',
        type: 'boot',
        brand: 'Jackson',
        model: 'Debut',
        size: '7.0',
        purchase_date: '2024-01-15',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'eq-2',
        skater_id: 'skater-1',
        name: 'Dance Blades',
        type: 'blade',
        brand: 'John Wilson',
        model: 'Coronation Ace',
        size: '9.75',
        purchase_date: '2024-02-01',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    render(
      <EquipmentList
        equipment={mockEquipment}
        onAdd={vi.fn()}
        onLogMaintenance={vi.fn()}
        onEditEquipment={vi.fn()}
      />
    );

    // Should render equipment items
    const equipmentItems = screen.getAllByTestId(/equipment-/);
    expect(equipmentItems.length).toBe(2);
    expect(screen.getByTestId('equipment-eq-1')).toBeInTheDocument();
    expect(screen.getByTestId('equipment-eq-2')).toBeInTheDocument();

    // Should display equipment names
    expect(screen.getByText('Freeskate Boots')).toBeInTheDocument();
    expect(screen.getByText('Dance Blades')).toBeInTheDocument();
  });

  it('should display empty state when no equipment', () => {
    render(
      <EquipmentList
        equipment={[]}
        onAdd={vi.fn()}
        onLogMaintenance={vi.fn()}
        onEditEquipment={vi.fn()}
      />
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No equipment found')).toBeInTheDocument();
  });

  it('should call onAdd when add button clicked', () => {
    const mockOnAdd = vi.fn();
    render(
      <EquipmentList
        equipment={[]}
        onAdd={mockOnAdd}
        onLogMaintenance={vi.fn()}
        onEditEquipment={vi.fn()}
      />
    );

    const addButton = screen.getByTestId('add-equipment-button');
    fireEvent.click(addButton);

    expect(mockOnAdd).toHaveBeenCalled();
  });

  it('should call onLogMaintenance when log button clicked', () => {
    const mockOnLogMaintenance = vi.fn();
    const mockEquipment = [
      {
        id: 'eq-1',
        skater_id: 'skater-1',
        name: 'Freeskate Boots',
        type: 'boot',
        brand: 'Jackson',
        model: 'Debut',
        size: '7.0',
        purchase_date: '2024-01-15',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    render(
      <EquipmentList
        equipment={mockEquipment}
        onAdd={vi.fn()}
        onLogMaintenance={mockOnLogMaintenance}
        onEditEquipment={vi.fn()}
      />
    );

    const logButton = screen.getByTestId('log-maintenance-eq-1');
    fireEvent.click(logButton);

    expect(mockOnLogMaintenance).toHaveBeenCalledWith('eq-1', mockEquipment[0]);
  });
});
