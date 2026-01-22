'use client';

import { useState, useEffect } from 'react';
import { getAuthToken } from '../../lib/supabase';
import GapEntryCard from './GapEntryCard';
import AddMetricModal from './AddMetricModal';

interface GapAnalysisEntry {
  id: string;
  metric_id: string;
  metric_name: string;
  metric_category: string;
  metric_data_type: string;
  metric_unit: string | null;
  current_value: string;
  target_value: string;
  gap_value: string;
  gap_percentage: number;
  status: 'on_target' | 'close' | 'needs_work';
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GapAnalysis {
  id: string;
  skater_id: string | null;
  team_id: string | null;
  last_updated: string;
  created_at: string;
  entries: GapAnalysisEntry[];
}

interface BenchmarkProfile {
  id: string;
  name: string;
  description: string | null;
}

interface GapAnalysisViewProps {
  skaterId: string;
  editable?: boolean;
}

export default function GapAnalysisView({ skaterId, editable = true }: GapAnalysisViewProps) {
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [profiles, setProfiles] = useState<BenchmarkProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    fetchGapAnalysis();
    if (editable) {
      fetchProfiles();
    }
  }, [skaterId]);

  const fetchGapAnalysis = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';
      const response = await fetch(`${api_url}/skaters/${skaterId}/gap-analysis`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setGapAnalysis(data);
      }
    } catch (error) {
      console.error('Failed to fetch gap analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';
      const response = await fetch(`${api_url}/benchmark-profiles/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      }
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
    }
  };

  const handleImportFromProfile = async (profileId: string) => {
    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';
      const response = await fetch(`${api_url}/skaters/${skaterId}/gap-analysis/from-profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ profile_id: profileId })
      });

      if (response.ok) {
        await fetchGapAnalysis();
        setShowProfileMenu(false);
      } else {
        const error = await response.json();
        alert(`Failed to import: ${error.detail}`);
      }
    } catch (error) {
      console.error('Failed to import from profile:', error);
      alert('Failed to import from profile');
    }
  };

  const handleUpdateEntry = async (id: string, data: any) => {
    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';
      const response = await fetch(`${api_url}/gap-analysis/entries/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        await fetchGapAnalysis();
      } else {
        throw new Error('Failed to update entry');
      }
    } catch (error) {
      console.error('Failed to update entry:', error);
      throw error;
    }
  };

  const handleArchiveEntry = async (id: string) => {
    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';
      const response = await fetch(`${api_url}/gap-analysis/entries/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchGapAnalysis();
      } else {
        throw new Error('Failed to archive entry');
      }
    } catch (error) {
      console.error('Failed to archive entry:', error);
      alert('Failed to archive entry');
    }
  };

  // Group entries by category
  const entriesByCategory: Record<string, GapAnalysisEntry[]> = (gapAnalysis?.entries || []).reduce(
    (acc, entry) => {
      if (!acc[entry.metric_category]) {
        acc[entry.metric_category] = [];
      }
      acc[entry.metric_category].push(entry);
      return acc;
    },
    {} as Record<string, GapAnalysisEntry[]>
  );

  // Format last updated time
  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Loading gap analysis...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gap Analysis</h2>
            {gapAnalysis && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {formatLastUpdated(gapAnalysis.last_updated)}
              </p>
            )}
          </div>

          {editable && (
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setShowAddMetric(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Metric
              </button>

              {profiles.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    Import from Profile
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showProfileMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowProfileMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                        <div className="py-1">
                          {profiles.map((profile) => (
                            <button
                              key={profile.id}
                              onClick={() => handleImportFromProfile(profile.id)}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <div className="font-medium">{profile.name}</div>
                              {profile.description && (
                                <div className="text-xs text-gray-500">{profile.description}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Entries grouped by category */}
        {Object.keys(entriesByCategory).length > 0 ? (
          Object.entries(entriesByCategory).map(([category, entries]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {category} ({entries.length} metric{entries.length !== 1 ? 's' : ''})
              </h3>
              <div className="space-y-3">
                {entries.map((entry) => (
                  <GapEntryCard
                    key={entry.id}
                    entry={entry}
                    editMode={editable}
                    onUpdate={handleUpdateEntry}
                    onArchive={handleArchiveEntry}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          /* Empty state */
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-semibold text-gray-900">No Gap Analysis Yet</h3>
            <p className="mt-1 text-gray-600 mb-4">
              Start by adding metrics or importing from a benchmark profile
            </p>
            {editable && (
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setShowAddMetric(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Metric
                </button>
                {profiles.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Import from Profile
                    </button>
                    {showProfileMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowProfileMenu(false)}
                        />
                        <div className="absolute left-0 mt-2 w-64 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                          <div className="py-1">
                            {profiles.map((profile) => (
                              <button
                                key={profile.id}
                                onClick={() => handleImportFromProfile(profile.id)}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <div className="font-medium">{profile.name}</div>
                                {profile.description && (
                                  <div className="text-xs text-gray-500">{profile.description}</div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Metric Modal */}
      <AddMetricModal
        isOpen={showAddMetric}
        onClose={() => setShowAddMetric(false)}
        skaterId={skaterId}
        onAdded={fetchGapAnalysis}
      />
    </div>
  );
}
