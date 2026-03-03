'use client';

import { useState } from 'react';
import { getAuthToken } from '../../lib/supabase';

export interface Metric {
  id: string;
  name: string;
  data_type: 'numeric' | 'scale' | 'boolean';
  unit: string | null;
  scale_min: number | null;
  scale_max: number | null;
}

export interface Skater {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
}

interface RecordSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMetrics: Metric[];
  initialSkaters: Skater[];
  initialTeams: Team[];
  profileId: string;
}

export default function RecordSessionModal({
  isOpen,
  onClose,
  initialMetrics,
  initialSkaters,
  initialTeams,
  profileId
}: RecordSessionModalProps) {
  const [entityType, setEntityType] = useState<'skater' | 'team'>('skater');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const selectedEntityField = entityType === 'skater' ? 'skater_id' : 'team_id';
  const entityOptions = entityType === 'skater' ? initialSkaters : initialTeams;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate entity selection
    if (!selectedEntityId) {
      setError(`Please select a ${entityType}`);
      return;
    }

    // Validate all metric values are present
    const missingMetrics = initialMetrics.filter(metric => !metricValues[metric.id]);
    if (missingMetrics.length > 0) {
      setError(`Please provide values for all metrics: ${missingMetrics.map(m => m.name).join(', ')}`);
      return;
    }

    setSubmitting(true);

    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

      const payload = {
        profile_id: profileId,
        [selectedEntityField]: selectedEntityId,
        date: sessionDate,
        notes: notes || null,
        results: initialMetrics.map(metric => ({
          metric_id: metric.id,
          value: metricValues[metric.id]
        }))
      };

      const response = await fetch(`${api_url}/benchmarks/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Reset form and close
        setSelectedEntityId('');
        setSessionDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        setMetricValues({});
        setError('');
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to record session' }));
        setError(errorData.detail || 'Failed to record session');
      }
    } catch (err) {
      console.error('Failed to record session:', err);
      setError('Failed to record session. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedEntityId('');
    setSessionDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setMetricValues({});
    setError('');
    onClose();
  };

  const renderMetricInput = (metric: Metric) => {
    switch (metric.data_type) {
      case 'numeric':
        return (
          <div key={metric.id}>
            <label htmlFor={`metric-${metric.id}`} className="block text-sm font-medium text-gray-700 mb-1">
              {metric.name}
              {metric.unit && <span className="text-gray-500 text-xs ml-1">({metric.unit})</span>}
            </label>
            <input
              id={`metric-${metric.id}`}
              type="number"
              value={metricValues[metric.id] || ''}
              onChange={(e) => setMetricValues({ ...metricValues, [metric.id]: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder={`Enter ${metric.name.toLowerCase()}`}
              required
            />
          </div>
        );

      case 'scale':
        const min = metric.scale_min ?? 1;
        const max = metric.scale_max ?? 10;
        const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

        return (
          <div key={metric.id}>
            <label htmlFor={`metric-${metric.id}`} className="block text-sm font-medium text-gray-700 mb-1">
              {metric.name}
              <span className="text-gray-500 text-xs ml-1">({min} - {max})</span>
            </label>
            <select
              id={`metric-${metric.id}`}
              value={metricValues[metric.id] || ''}
              onChange={(e) => setMetricValues({ ...metricValues, [metric.id]: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select rating</option>
              {options.map(val => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          </div>
        );

      case 'boolean':
        return (
          <div key={metric.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {metric.name}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`metric-${metric.id}`}
                  value="true"
                  checked={metricValues[metric.id] === 'true'}
                  onChange={(e) => setMetricValues({ ...metricValues, [metric.id]: e.target.value })}
                  className="w-4 h-4"
                  required
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`metric-${metric.id}`}
                  value="false"
                  checked={metricValues[metric.id] === 'false'}
                  onChange={(e) => setMetricValues({ ...metricValues, [metric.id]: e.target.value })}
                  className="w-4 h-4"
                  required
                />
                <span>No</span>
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Record Benchmark Session</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              type="button"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} role="form" noValidate className="space-y-4">
            {/* Entity Type Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Record for
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="entityType"
                    value="skater"
                    checked={entityType === 'skater'}
                    onChange={(e) => {
                      setEntityType(e.target.value as 'skater' | 'team');
                      setSelectedEntityId('');
                    }}
                    className="w-4 h-4"
                  />
                  <span>Skater</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="entityType"
                    value="team"
                    checked={entityType === 'team'}
                    onChange={(e) => {
                      setEntityType(e.target.value as 'skater' | 'team');
                      setSelectedEntityId('');
                    }}
                    className="w-4 h-4"
                  />
                  <span>Team</span>
                </label>
              </div>
            </div>

            {/* Entity Dropdown */}
            <div>
              <label htmlFor="entity-select" className="block text-sm font-medium text-gray-700 mb-1">
                Select {entityType === 'skater' ? 'Skater' : 'Team'}
              </label>
              <select
                id="entity-select"
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">-- Select {entityType === 'skater' ? 'a skater' : 'a team'} --</option>
                {entityOptions.map(entity => (
                  <option key={entity.id} value={entity.id}>{entity.name}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label htmlFor="session-date" className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                id="session-date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="session-notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                id="session-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Add any notes about this session..."
              />
            </div>

            {/* Metrics Section */}
            {initialMetrics.length > 0 && (
              <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Metrics ({initialMetrics.length})
                </h3>
                <div className="space-y-3">
                  {initialMetrics.map(renderMetricInput)}
                </div>
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
                {submitting ? 'Recording...' : 'Record Session'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
