'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '../../../../lib/supabase';

interface Metric {
  id: string;
  name: string;
  category: string;
  data_type: 'numeric' | 'scale' | 'boolean';
  unit?: string;
  scale_min?: number;
  scale_max?: number;
}

interface Skater {
  id: string;
  full_name: string;
}

interface Team {
  id: string;
  team_name: string;
}

interface RecordSessionFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialMetrics?: Metric[];
  initialSkaters?: Skater[];
  initialTeams?: Team[];
  profileId: string;
}

export default function RecordSessionForm({
  isOpen,
  onClose,
  initialMetrics = [],
  initialSkaters = [],
  initialTeams = [],
  profileId,
}: RecordSessionFormProps) {
  const router = useRouter();
  const [entityType, setEntityType] = useState<'skater' | 'team'>('skater');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [sessionDate, setSessionDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (!isOpen) return;
    setEntityType('skater');
    setSelectedEntityId(null);
    setSessionDate('');
    setNotes('');
    setMetricValues({});
    setErrors({});
  }, [isOpen, initialMetrics, initialSkaters, initialTeams, profileId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    if (!selectedEntityId) {
      setErrors(prev => ({ ...prev, entity: 'Please select a skater or team.' }));
      setSubmitting(false);
      return;
    }

    const missingValues = initialMetrics.filter(m => !metricValues[m.id]);
    if (missingValues.length > 0) {
      setErrors(prev => ({
        ...prev,
        ...Object.fromEntries(missingValues).reduce((acc, metric) => ({
          ...acc,
          [metric.name]: 'Please provide a value for all metrics.'
        }), {})
      }));
      setSubmitting(false);
      return;
    }

    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';

      const payload = {
        profile_id: profileId,
        date: sessionDate,
        notes: notes || null,
        results: Object.entries(metricValues).map(([metricId, value]) => ({
          metric_id: metricId,
          value
        }))
      };

      if (entityType === 'skater') {
        payload.skater_id = selectedEntityId;
      } else if (entityType === 'team') {
        payload.team_id = selectedEntityId;
      }

      const response = await fetch(`${api_url}/benchmarks/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        router.push('/dashboard/roster');
        onClose();
      } else {
        const errorData = await response.json();
        setErrors({ submit: errorData.detail || 'Failed to save session' });
      }
    } catch (error) {
      console.error('Failed to save session:', error);
      setErrors({ submit: 'Failed to save session. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {profileId ? 'Record Benchmark Session' : 'Add Benchmark Session'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {errors.submit && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {Object.entries(errors.submit).map(([field, error]) => (
                <div key={field} className="text-sm">{error}</div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Entity Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entity Type
              </label>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="entityType"
                    value="skater"
                    checked={entityType === 'skater'}
                    onChange={() => setEntityType('skater')}
                    data-testid="entity-skater"
                  />
                  <span>Skater</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="entityType"
                    value="team"
                    checked={entityType === 'team'}
                    onChange={() => setEntityType('team')}
                    data-testid="entity-team"
                  />
                  <span>Team</span>
                </label>
              </div>
            </div>

            {/* Entity Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {entityType === 'skater' ? 'Select Skater' : 'Select Team'}
              </label>
              <select
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                className="w-full px-3 py-2 border-gray-300 rounded-md"
                data-testid="entity-dropdown"
              >
                <option value="">Select...</option>
                {entityType === 'skater' && initialSkaters.map(skater => (
                  <option key={skater.id} value={skater.id}>
                    {skater.full_name}
                  </option>
                ))}
                {entityType === 'team' && initialTeams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.team_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Session Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Date
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full px-3 py-2 border-gray-300 rounded-md"
                data-testid="session-date"
                required
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border-gray-300 rounded-md resize-none"
                placeholder="Optional notes about this session..."
                data-testid="session-notes"
              />
            </div>

            {/* Metrics Section */}
            <div data-testid="metrics-section">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Metrics</h3>
              {initialMetrics.length === 0 ? (
                <p className="text-muted-foreground">No metrics available in this profile.</p>
              ) : (
                <div className="space-y-4">
                  {initialMetrics.map((metric) => (
                    <div key={metric.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-gray-900">{metric.name}</h4>
                        <span className="text-sm text-muted-foreground">
                          {metric.data_type === 'numeric' && metric.unit && `(${metric.unit})`}
                          {metric.data_type === 'scale' && `(${metric.scale_min} - ${metric.scale_max})`}
                          {metric.data_type === 'boolean' && '(Yes / No)'}
                        </span>
                        </div>

                      <div className="flex flex-1">
                        {/* Numeric input */}
                        {metric.data_type === 'numeric' && (
                          <input
                            type="number"
                            step="0.5"
                            placeholder={`Value in ${metric.unit || 'unit'}`}
                            value={metricValues[metric.id] || ''}
                            onChange={(e) => setMetricValues(prev => ({
                              ...prev,
                              [metric.id]: e.target.value
                            }))}
                            className="w-full px-3 py-2 border-gray-300 rounded-md"
                            data-testid={`numeric-input-${metric.id}`}
                          />
                        )}

                        {/* Scale input */}
                        {metric.data_type === 'scale' && (
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Value ({metric.scale_min} - {metric.scale_max})
                            </label>
                            <select
                              value={metricValues[metric.id] || ''}
                              onChange={(e) => setMetricValues(prev => ({
                                ...prev,
                                [metric.id]: e.target.value
                              }))}
                              className="w-full px-3 py-2 border-gray-300 rounded-md"
                              min={metric.scale_min}
                              max={metric.scale_max}
                              required
                            >
                              <option value="">Select...</option>
                              {Array.from(
                                { length: metric.scale_max - metric.scale_min + 1 },
                                (_, i) => i + metric.scale_min
                              ).map(i => (
                                  <option key={i} value={String(i)}>
                                    {i}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Boolean input */}
                      {metric.data_type === 'boolean' && (
                        <div>
                          <div>
                            <div>
                              <label className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`boolean-${metric.id}`}
                                  value="true"
                                  checked={metricValues[metric.id] === 'true'}
                                  onChange={(e) => setMetricValues(prev => ({
                                    ...prev,
                                    [metric.id]: 'true'
                                  }))}
                                  className="w-4 h-4 text-blue-600"
                                  data-testid={`boolean-true-${metric.id}`}
                                />
                                <span className="text-sm">Yes</span>
                              </label>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`boolean-${metric.id}`}
                                value="false"
                                checked={metricValues[metric.id] === 'false'}
                                onChange={(e) => setMetricValues(prev => ({
                                  ...prev,
                                    [metric.id]: 'false'
                                }))}
                                  className="w-4 h-4 text-blue-600"
                                  data-testid={`boolean-false-${metric.id}`}
                                />
                                <span className="text-sm">No</span>
                              </label>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            )}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4 border-t">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              data-testid="submit-button"
            >
              {submitting ? 'Saving...' : 'Save Session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
