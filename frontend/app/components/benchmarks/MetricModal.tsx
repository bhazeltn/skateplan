'use client';

import { useState, useEffect } from 'react';
import { getAuthToken } from '../../lib/supabase';

interface Metric {
  id?: string;
  name: string;
  description: string | null;
  category: string;
  data_type: string;
  unit: string | null;
  scale_min: number | null;
  scale_max: number | null;
}

interface MetricModalProps {
  isOpen: boolean;
  onClose: () => void;
  metric?: Metric | null; // If provided, edit mode
  onSuccess: () => void;
}

const CATEGORIES = ['Technical', 'Physical', 'Mental', 'Tactical', 'Environmental'];
const DATA_TYPES = ['numeric', 'scale', 'boolean'];

export default function MetricModal({ isOpen, onClose, metric, onSuccess }: MetricModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technical');
  const [dataType, setDataType] = useState('numeric');
  const [unit, setUnit] = useState('');
  const [scaleMin, setScaleMin] = useState('1');
  const [scaleMax, setScaleMax] = useState('10');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (metric) {
      setName(metric.name);
      setDescription(metric.description || '');
      setCategory(metric.category);
      setDataType(metric.data_type);
      setUnit(metric.unit || '');
      setScaleMin(metric.scale_min?.toString() || '1');
      setScaleMax(metric.scale_max?.toString() || '10');
    } else {
      // Reset form for create mode
      setName('');
      setDescription('');
      setCategory('Technical');
      setDataType('numeric');
      setUnit('');
      setScaleMin('1');
      setScaleMax('10');
    }
    setError('');
  }, [metric, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Metric name is required');
      return;
    }

    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    if (dataType === 'scale') {
      const min = parseInt(scaleMin);
      const max = parseInt(scaleMax);
      if (isNaN(min) || isNaN(max) || min >= max) {
        setError('Scale minimum must be less than maximum');
        return;
      }
    }

    setSubmitting(true);
    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';

      const payload: any = {
        name: name.trim(),
        description: description.trim() || null,
        category,
        data_type: dataType
      };

      if (dataType === 'numeric') {
        payload.unit = unit.trim() || null;
      } else if (dataType === 'scale') {
        payload.scale_min = parseInt(scaleMin);
        payload.scale_max = parseInt(scaleMax);
      }

      const url = metric
        ? `${api_url}/metrics/${metric.id}`
        : `${api_url}/metrics/`;

      const method = metric ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        onSuccess();
        handleClose();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || `Failed to ${metric ? 'update' : 'create'} metric`);
      }
    } catch (err) {
      console.error('Failed to save metric:', err);
      setError(`Failed to ${metric ? 'update' : 'create'} metric. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setCategory('Technical');
    setDataType('numeric');
    setUnit('');
    setScaleMin('1');
    setScaleMax('10');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {metric ? 'Edit Metric' : 'Create Metric'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Metric Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Metric Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., Vertical Jump, Double Axel Consistency"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description * <span className="text-xs text-gray-500">(required)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Describe how this metric is measured to ensure consistency"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Data Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Type *
              </label>
              <div className="space-y-2">
                {DATA_TYPES.map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="radio"
                      value={type}
                      checked={dataType === type}
                      onChange={(e) => setDataType(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 capitalize">{type}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      {type === 'numeric' && '(e.g., 12.5, 85)'}
                      {type === 'scale' && '(e.g., 1-10, 1-5)'}
                      {type === 'boolean' && '(Yes/No, True/False)'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Numeric Fields */}
            {dataType === 'numeric' && (
              <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit (optional)
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                  placeholder="e.g., inches, %, reps, seconds, kg"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Common units: inches, cm, %, reps, seconds, minutes, kg, lbs
                </p>
              </div>
            )}

            {/* Scale Fields */}
            {dataType === 'scale' && (
              <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scale Range *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Minimum Value</label>
                    <input
                      type="number"
                      value={scaleMin}
                      onChange={(e) => setScaleMin(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Maximum Value</label>
                    <input
                      type="number"
                      value={scaleMax}
                      onChange={(e) => setScaleMax(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                      required
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Examples: 1 to 10, -5 to +5, 0 to 100
                </p>
              </div>
            )}

            {/* Boolean info */}
            {dataType === 'boolean' && (
              <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                <p className="text-sm text-gray-600">
                  Boolean metrics are answered with Yes/No or True/False.
                  <br />
                  Examples: "Passed STAR 10 test", "Completed mental training"
                </p>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
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
                {submitting
                  ? (metric ? 'Updating...' : 'Creating...')
                  : (metric ? 'Update Metric' : 'Create Metric')
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
