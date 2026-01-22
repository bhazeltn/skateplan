'use client';

import { useState, useEffect } from 'react';
import { getAuthToken } from '../../lib/supabase';

interface Metric {
  id: string;
  name: string;
  category: string;
  data_type: string;
  unit: string | null;
  scale_min: number | null;
  scale_max: number | null;
}

interface AddMetricModalProps {
  isOpen: boolean;
  onClose: () => void;
  skaterId: string;
  onAdded: () => void;
}

export default function AddMetricModal({ isOpen, onClose, skaterId, onAdded }: AddMetricModalProps) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchMetrics();
    }
  }, [isOpen]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';
      const response = await fetch(`${api_url}/metrics/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedMetric || !currentValue || !targetValue) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';

      const response = await fetch(`${api_url}/skaters/${skaterId}/gap-analysis/entries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metric_id: selectedMetric,
          current_value: currentValue,
          target_value: targetValue,
          notes: notes || null
        })
      });

      if (response.ok) {
        onAdded();
        handleClose();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to add metric');
      }
    } catch (err) {
      console.error('Failed to add metric:', err);
      setError('Failed to add metric. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedMetric('');
    setCurrentValue('');
    setTargetValue('');
    setNotes('');
    setError('');
    onClose();
  };

  // Group metrics by category
  const metricsByCategory = metrics.reduce((acc, metric) => {
    if (!acc[metric.category]) {
      acc[metric.category] = [];
    }
    acc[metric.category].push(metric);
    return acc;
  }, {} as Record<string, Metric[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Add Metric to Gap Analysis</h2>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Metric *
              </label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Choose a metric...</option>
                {Object.entries(metricsByCategory).map(([category, categoryMetrics]) => (
                  <optgroup key={category} label={category}>
                    {categoryMetrics.map((metric) => (
                      <option key={metric.id} value={metric.id}>
                        {metric.name}
                        {metric.unit && ` (${metric.unit})`}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Value *
                </label>
                <input
                  type="number"
                  step="any"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Value *
                </label>
                <input
                  type="number"
                  step="any"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Add any notes about this metric..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Metric'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
