'use client';

import { useState, useEffect } from 'react';
import { getAuthToken } from '../../lib/supabase';

interface Skater {
  id: string;
  full_name: string;
  email: string;
  dob: string | null;
  level: string | null;
  is_active: boolean;
  home_club: string | null;
}

interface AddTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddTeamModal({ isOpen, onClose, onSuccess }: AddTeamModalProps) {
  const [skaterAId, setSkaterAId] = useState('');
  const [skaterBId, setSkaterBId] = useState('');
  const [discipline, setDiscipline] = useState('PAIRS');
  const [teamLevel, setTeamLevel] = useState('');
  const [skaters, setSkaters] = useState<Skater[]>([]);
  const [error, setError] = useState('');

  // Fetch skaters on mount
  useEffect(() => {
    const fetchSkaters = async () => {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

      try {
        const res = await fetch(`${api_url}/skaters/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setSkaters(data);
        }
      } catch (err) {
        console.error('Failed to fetch skaters:', err);
      }
    };

    if (isOpen) {
      fetchSkaters();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (skaterAId === skaterBId) {
      setError('Please select two different skaters');
      return;
    }

    const token = await getAuthToken();
    const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

    try {
      const res = await fetch(`${api_url}/partnerships/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          skater_a_id: skaterAId,
          skater_b_id: skaterBId,
          discipline: discipline,
          team_level: teamLevel || null
        })
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Unauthorized. Please login again.');
        }
        if (res.status === 403) {
          throw new Error('Not authorized to create partnership for these skaters.');
        }
        if (res.status === 422) {
          throw new Error('Validation Error. Check your inputs.');
        }
        throw new Error('Failed to create team');
      }

      // Success
      onSuccess();
      // Reset form
      setSkaterAId('');
      setSkaterBId('');
      setDiscipline('PAIRS');
      setTeamLevel('');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
        <h3 className="mb-4 text-lg font-bold text-gray-900">Add New Team</h3>
        {error && <div className="p-2 mb-4 text-sm text-red-700 bg-red-100 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Skater 1</label>
            <select
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
              value={skaterAId}
              onChange={(e) => setSkaterAId(e.target.value)}
              required
            >
              <option value="">Select Skater 1</option>
              {skaters.map((skater) => (
                <option key={skater.id} value={skater.id}>
                  {skater.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Skater 2</label>
            <select
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
              value={skaterBId}
              onChange={(e) => setSkaterBId(e.target.value)}
              required
            >
              <option value="">Select Skater 2</option>
              {skaters.map((skater) => (
                <option key={skater.id} value={skater.id}>
                  {skater.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Discipline</label>
            <select
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              required
            >
              <option value="PAIRS">Pairs</option>
              <option value="ICE_DANCE">Ice Dance</option>
              <option value="SYNCHRO">Synchronized</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Team Level (Optional)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white placeholder:text-gray-400"
              value={teamLevel}
              onChange={(e) => setTeamLevel(e.target.value)}
              placeholder="e.g., Junior, Senior"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              Create Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
