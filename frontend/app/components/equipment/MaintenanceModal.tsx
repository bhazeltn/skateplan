'use client';

import { useState, FormEvent } from 'react';
import { getAuthToken } from '../../lib/supabase';
import type { MaintenanceType, MaintenanceLog, Equipment } from '../../lib/types/models';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  equipmentId: string;
  equipment: Equipment | null;
}

const MAINTENANCE_TYPES: { value: MaintenanceType; label: string }[] = [
  { value: 'sharpening', label: 'Sharpening' },
  { value: 'mounting', label: 'Mounting' },
  { value: 'waterproofing', label: 'Waterproofing' },
  { value: 'repair', label: 'Repair' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'other', label: 'Other' },
];

export default function MaintenanceModal({
  isOpen,
  onClose,
  onSuccess,
  equipmentId,
  equipment,
}: MaintenanceModalProps) {
  const [formData, setFormData] = useState({
    date: '',
    maintenance_type: 'sharpening',
    location: '',
    technician: '',
    specifications: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

      const payload = {
        date: formData.date,
        maintenance_type: formData.maintenance_type,
        location: formData.location,
        technician: formData.technician || null,
        specifications: formData.specifications || null,
        notes: formData.notes || null,
      };

      const response = await fetch(`${api_url}/equipment/${equipmentId}/maintenance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setFormData({
          date: '',
          maintenance_type: 'sharpening',
          location: '',
          technician: '',
          specifications: '',
          notes: '',
        });
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to record maintenance' }));
        setError(errorData.detail || 'Failed to record maintenance');
      }
    } catch (err) {
      console.error('Failed to record maintenance:', err);
      setError('Failed to record maintenance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClose = () => {
    setFormData({
      date: '',
      maintenance_type: 'sharpening',
      location: '',
      technician: '',
      specifications: '',
      notes: '',
    });
    setError('');
    onClose();
  };

  // Sort maintenance logs by date (newest first)
  const sortedLogs = equipment?.maintenance_logs
    ? [...equipment.maintenance_logs].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ).reverse()
    : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4 pb-4 border-b">
          <h2 className="text-xl font-bold text-gray-900" data-testid="maintenance-header">
            Maintenance: {equipment?.name || equipment?.brand} {equipment?.model}
          </h2>
          <button
            onClick={handleClose}
            type="button"
            data-testid="close-maintenance-modal-button"
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-6">
          {/* Maintenance History List */}
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Maintenance History</h3>
            <div data-testid="maintenance-list" className="space-y-3">
              {sortedLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500" data-testid="no-maintenance">
                  No maintenance records
                </div>
              ) : (
                sortedLogs.map((log: MaintenanceLog) => (
                  <div
                    key={log.id}
                    data-testid={`maintenance-${log.id}`}
                    data-date={log.date}
                    data-type={log.maintenance_type}
                    className="p-3 border border-gray-200 rounded-md bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(log.date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {MAINTENANCE_TYPES.find(t => t.value === log.maintenance_type)?.label} - {log.location}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {log.id}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {log.technician && (
                        <p>
                          <span className="font-medium">Technician:</span> {log.technician}
                        </p>
                      )}
                      {log.specifications && (
                        <p>
                          <span className="font-medium">Specs:</span> {log.specifications}
                        </p>
                      )}
                      {log.notes && (
                        <p className="italic text-gray-500">"{log.notes}"</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Maintenance Form */}
          <div className="w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Log New Maintenance</h3>
            <form onSubmit={handleSubmit} data-testid="maintenance-form" className="space-y-4">
              {/* Date */}
              <div>
                <label htmlFor="maintenance-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  id="maintenance-date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  data-testid="maintenance-date-input"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Type */}
              <div>
                <label htmlFor="maintenance-type" className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  id="maintenance-type"
                  name="maintenance_type"
                  value={formData.maintenance_type}
                  onChange={handleChange}
                  data-testid="maintenance-type-select"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select type...</option>
                  {MAINTENANCE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  data-testid="location-input"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Technician (optional) */}
              <div>
                <label htmlFor="technician" className="block text-sm font-medium text-gray-700 mb-1">
                  Technician (optional)
                </label>
                <input
                  type="text"
                  id="technician"
                  name="technician"
                  value={formData.technician}
                  onChange={handleChange}
                  data-testid="technician-input"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Specifications (optional) */}
              <div>
                <label htmlFor="specifications" className="block text-sm font-medium text-gray-700 mb-1">
                  Specifications (optional)
                </label>
                <textarea
                  id="specifications"
                  name="specifications"
                  value={formData.specifications}
                  onChange={handleChange}
                  data-testid="specifications-input"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Hollow: 7/16, Profile: Flat"
                />
              </div>

              {/* Notes (optional) */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  data-testid="notes-input"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any notes about this maintenance..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Log Maintenance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
