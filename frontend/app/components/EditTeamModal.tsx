'use client';

import { useState, useEffect } from 'react';
import { getAuthToken } from '../lib/supabase';

interface Partnership {
  id: string;
  skater_a_id: string;
  skater_a_name: string;
  skater_b_id: string;
  skater_b_name: string;
  discipline: string;
  team_level: string | null;
  is_active: boolean;
}

interface EditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  team: Partnership;
}

export default function EditTeamModal({ isOpen, onClose, onSuccess, team }: EditTeamModalProps) {
  const [discipline, setDiscipline] = useState(team.discipline);
  const [teamLevel, setTeamLevel] = useState(team.team_level || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens or team changes
  useEffect(() => {
    if (isOpen) {
      setDiscipline(team.discipline);
      setTeamLevel(team.team_level || '');
      setError('');
    }
  }, [isOpen, team]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';

      const payload = {
        discipline,
        team_level: teamLevel || null
      };

      const res = await fetch(`${api_url}/partnerships/${team.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to update team');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Team</h2>

        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-700">
            <strong>{team.skater_a_name}</strong> / <strong>{team.skater_b_name}</strong>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Discipline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discipline <span className="text-red-500">*</span>
            </label>
            <select
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="PAIRS">Pairs</option>
              <option value="ICE_DANCE">Ice Dance</option>
              <option value="SYNCHRO">Synchronized</option>
            </select>
          </div>

          {/* Team Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Level
            </label>
            <input
              type="text"
              value={teamLevel}
              onChange={(e) => setTeamLevel(e.target.value)}
              placeholder="e.g., Junior, Senior, Advanced Novice"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional: Specify the competitive level of this team
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
