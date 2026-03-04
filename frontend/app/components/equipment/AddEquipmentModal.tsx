'use client';

import { useState, FormEvent } from 'react';
import { getAuthToken } from '../../lib/supabase';
import type { EquipmentFormData } from '../../lib/types/models';

interface AddEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  skaterId: string;
}

export default function AddEquipmentModal({
  isOpen,
  onClose,
  onSuccess,
  skaterId,
}: AddEquipmentModalProps) {
  const [formData, setFormData] = useState<EquipmentFormData>({
    name: '',
    type: 'boot',
    brand: '',
    model: '',
    size: '',
    purchase_date: '',
    is_active: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (submitting) return;

    const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

    try {
      const token = await getAuthToken();

      const payload = {
        name: formData.name || null,
        type: formData.type,
        brand: formData.brand,
        model: formData.model,
        size: formData.size,
        purchase_date: formData.purchase_date ? new Date(formData.purchase_date).toISOString() : null,
        is_active: formData.is_active,
      };

      const response = await fetch(`${api_url}/skaters/${skaterId}/equipment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onSuccess();
        onClose();
        setFormData({
          name: '',
          type: 'boot',
          brand: '',
          model: '',
          size: '',
          purchase_date: '',
          is_active: true,
        });
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to add equipment' }));
        setError(errorData.detail || 'Failed to add equipment');
      }
    } catch (err) {
      console.error('Failed to add equipment:', err);
      setError('Failed to add equipment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      type: 'boot',
      brand: '',
      model: '',
      size: '',
      purchase_date: '',
      is_active: true,
    });
    setError('');
    onClose();
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, type: e.target.value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Add Equipment</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            type="button"
            data-testid="close-modal-button"
          >
            Close
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} data-testid="add-equipment-form">
          <div className="space-y-4">
            {/* Equipment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Equipment Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="type"
                    value="boot"
                    checked={formData.type === 'boot'}
                    onChange={handleTypeChange}
                    className="w-4 h-4"
                    data-testid="type-boot"
                  />
                  <span className="text-sm text-gray-600">Boot</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="type"
                    value="blade"
                    checked={formData.type === 'blade'}
                    onChange={handleTypeChange}
                    className="w-4 h-4"
                    data-testid="type-blade"
                  />
                  <span className="text-sm text-gray-600">Blade</span>
                </label>
              </div>
            </div>

            {/* Name (optional) */}
            <div>
              <label htmlFor="name-input" className="block text-sm font-medium text-gray-700 mb-2">
                Name (optional)
              </label>
              <input
                id="name-input"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                data-testid="name-input"
                placeholder="e.g. 'e.g., Dance Boots'"
              />
            </div>

            {/* Brand */}
            <div>
              <label htmlFor="brand-input" className="block text-sm font-medium text-gray-700 mb-2">
                Brand
              </label>
              <input
                id="brand-input"
                name="brand"
                value={formData.brand}
                onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                data-testid="brand-input"
                required
              />
            </div>

            {/* Model */}
            <div>
              <label htmlFor="model-input" className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <input
                id="model-input"
                name="model"
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                data-testid="model-input"
                required
              />
            </div>

            {/* Size */}
            <div>
              <label htmlFor="size-input" className="block text-sm font-medium text-gray-700 mb-2">
                Size
              </label>
              <input
                id="size-input"
                name="size"
                value={formData.size}
                onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                className="w-full px-3 py-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                data-testid="size-input"
                required
              />
            </div>

            {/* Purchase Date */}
            <div>
              <label htmlFor="purchase-date-input" className="block text-sm font-medium text-gray-700 mb-2">
                Purchase Date
              </label>
              <input
                type="date"
                id="purchase-date-input"
                name="purchase_date"
                value={formData.purchase_date}
                onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
                className="w-full px-3 py-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                data-testid="purchase-date-input"
              />
            </div>

            {/* Active */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-active-input"
                name="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked ? !prev.is_active : prev.is_active }))}
                className="w-4 h-4"
                data-testid="is-active-input"
              />
              <label htmlFor="is-active-input" className="text-sm font-medium text-gray-700 mb-2">
                Active
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Equipment'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
