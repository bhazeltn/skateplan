'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getAuthToken } from '../../../lib/supabase';
import { FederationFlag } from '../../../components/FederationFlag';

interface SkaterDetail {
  id: string;
  full_name: string;
  dob: string | null;
  federation_code: string | null;
  federation_name: string | null;
  federation_iso_code: string | null;
  country_name: string | null;
  current_level: string | null;
}

interface PartnershipDetail {
  id: string;
  skater_a: SkaterDetail;
  skater_b: SkaterDetail;
  discipline: string;
  team_level: string | null;
  is_active: boolean;
}

export default function TeamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.id as string;

  const [partnership, setPartnership] = useState<PartnershipDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [discipline, setDiscipline] = useState('');
  const [teamLevel, setTeamLevel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchPartnership = async () => {
    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';

      const res = await fetch(`${api_url}/partnerships/${teamId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setPartnership(data);
        setDiscipline(data.discipline);
        setTeamLevel(data.team_level || '');
      } else {
        setError('Failed to load team details');
      }
    } catch (err) {
      console.error('Error fetching partnership:', err);
      setError('Error loading team details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartnership();
  }, [teamId]);

  const handleSave = async () => {
    if (!partnership) return;

    setSaving(true);
    setError('');

    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';

      const res = await fetch(`${api_url}/partnerships/${teamId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          discipline,
          team_level: teamLevel || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPartnership(data);
        setIsEditing(false);
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Failed to update team');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating team');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }

    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';

      const res = await fetch(`${api_url}/partnerships/${teamId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        router.push('/dashboard/teams');
      } else {
        alert('Failed to delete team');
      }
    } catch (err) {
      console.error('Error deleting team:', err);
      alert('Error deleting team');
    }
  };

  const formatDiscipline = (disc: string) => {
    const map: Record<string, string> = {
      'PAIRS': 'Pairs',
      'ICE_DANCE': 'Ice Dance',
      'SYNCHRO': 'Synchronized'
    };
    return map[disc] || disc;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <p className="text-gray-600">Loading team details...</p>
      </div>
    );
  }

  if (error && !partnership) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <button
          onClick={() => router.push('/dashboard/teams')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Teams
        </button>
      </div>
    );
  }

  if (!partnership) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push('/dashboard/teams')}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
          >
            ← Back to Teams
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {partnership.skater_a.full_name} / {partnership.skater_b.full_name}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Team Info Card */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Team Details</h2>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setDiscipline(partnership.discipline);
                      setTeamLevel(partnership.team_level || '');
                      setError('');
                    }}
                    disabled={saving}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Discipline */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Discipline</label>
            {isEditing ? (
              <select
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="PAIRS">Pairs</option>
                <option value="ICE_DANCE">Ice Dance</option>
                <option value="SYNCHRO">Synchronized</option>
              </select>
            ) : (
              <p className="text-gray-900">{formatDiscipline(partnership.discipline)}</p>
            )}
          </div>

          {/* Team Level */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Team Level</label>
            {isEditing ? (
              <input
                type="text"
                value={teamLevel}
                onChange={(e) => setTeamLevel(e.target.value)}
                placeholder="e.g., Junior, Senior"
                className="w-full px-3 py-2 border rounded-md"
              />
            ) : (
              <p className="text-gray-900">{partnership.team_level || '—'}</p>
            )}
          </div>

          {/* Status */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${partnership.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {partnership.is_active ? 'Active' : 'Archived'}
            </span>
          </div>
        </div>

        {/* Skater A Card */}
        <div className="bg-white shadow rounded-lg p-6 mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Partner A</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Name</p>
              <p className="text-gray-900">{partnership.skater_a.full_name}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700">Date of Birth</p>
              <p className="text-gray-900">{partnership.skater_a.dob || '—'}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700">Federation</p>
              <div className="flex items-center gap-2">
                {partnership.skater_a.federation_iso_code && (
                  <FederationFlag iso_code={partnership.skater_a.federation_iso_code} size="small" />
                )}
                <p className="text-gray-900">
                  {partnership.skater_a.country_name || partnership.skater_a.federation_name || '—'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700">Current Level</p>
              <p className="text-gray-900">{partnership.skater_a.current_level || '—'}</p>
            </div>
          </div>
        </div>

        {/* Skater B Card */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Partner B</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Name</p>
              <p className="text-gray-900">{partnership.skater_b.full_name}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700">Date of Birth</p>
              <p className="text-gray-900">{partnership.skater_b.dob || '—'}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700">Federation</p>
              <div className="flex items-center gap-2">
                {partnership.skater_b.federation_iso_code && (
                  <FederationFlag iso_code={partnership.skater_b.federation_iso_code} size="small" />
                )}
                <p className="text-gray-900">
                  {partnership.skater_b.country_name || partnership.skater_b.federation_name || '—'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700">Current Level</p>
              <p className="text-gray-900">{partnership.skater_b.current_level || '—'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
