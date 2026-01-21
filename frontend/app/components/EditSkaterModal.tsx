'use client';

import { useState, useEffect } from 'react';
import { getAuthToken } from '../lib/supabase';

interface Federation {
  id: string;
  name: string;
  code: string;
  iso_code: string;
  country_name?: string;
}

interface Level {
  id: string;
  stream_display: string;
  level_name: string;
  display_name: string;
  level_order: number;
  is_adult: boolean;
}

interface Skater {
  id: string;
  full_name: string;
  dob: string | null;
  federation_code: string | null;
  discipline: string;
  current_level: string;
  training_site: string | null;
  home_club: string | null;
}

interface EditSkaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  skater: Skater;
}

export default function EditSkaterModal({ isOpen, onClose, onSuccess, skater }: EditSkaterModalProps) {
  // State
  const [federations, setFederations] = useState<Federation[]>([]);
  const [federationCode, setFederationCode] = useState(skater.federation_code || '');
  const [fullName, setFullName] = useState(skater.full_name);
  const [dob, setDob] = useState(skater.dob || '');
  const [discipline, setDiscipline] = useState(skater.discipline);
  const [levels, setLevels] = useState<Level[]>([]);
  const [level, setLevel] = useState(skater.current_level);
  const [trainingSite, setTrainingSite] = useState(skater.training_site || '');
  const [homeClub, setHomeClub] = useState(skater.home_club || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Available disciplines
  const BASE_DISCIPLINES = [
    { value: 'Singles', label: 'Singles / Freeskating' },
    { value: 'Solo_Dance', label: 'Solo Dance' }
  ];

  // Reset form when modal opens/closes or skater changes
  useEffect(() => {
    if (isOpen) {
      setFederationCode(skater.federation_code || '');
      setFullName(skater.full_name);
      setDob(skater.dob || '');
      setDiscipline(skater.discipline);
      setLevel(skater.current_level);
      setTrainingSite(skater.training_site || '');
      setHomeClub(skater.home_club || '');
      setError('');
    }
  }, [isOpen, skater]);

  // Fetch federations on mount
  useEffect(() => {
    const fetchFederations = async () => {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';

      try {
        const res = await fetch(`${api_url}/federations/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setFederations(data);
        }
      } catch (err) {
        console.error('Failed to fetch federations:', err);
      }
    };

    if (isOpen) {
      fetchFederations();
    }
  }, [isOpen]);

  // Fetch levels when federation or discipline changes
  useEffect(() => {
    const fetchLevels = async () => {
      if (!federationCode || !discipline) {
        setLevels([]);
        return;
      }

      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';

      try {
        const dobDate = dob ? new Date(dob) : null;
        const today = new Date();
        let age = null;

        if (dobDate) {
          age = today.getFullYear() - dobDate.getFullYear();
          const monthDiff = today.getMonth() - dobDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
            age--;
          }
        }

        const res = await fetch(
          `${api_url}/federations/${federationCode}/levels?discipline=${discipline}&include_isi=false${age !== null ? `&age=${age}` : ''}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (res.ok) {
          const data: Level[] = await res.json();
          setLevels(data);
        }
      } catch (error) {
        console.error('Error loading levels:', error);
      }
    };

    fetchLevels();
  }, [federationCode, discipline, dob]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';

      const payload: any = {
        full_name: fullName,
        dob: dob || null,
        federation_code: federationCode,
        discipline,
        current_level: level,
        training_site: trainingSite || null,
        home_club: homeClub || null,
      };

      const res = await fetch(`${api_url}/skaters/${skater.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to update skater');
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
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Skater</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Federation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Federation *</label>
            <select
              value={federationCode}
              onChange={(e) => {
                setFederationCode(e.target.value);
                setLevel(''); // Reset level when federation changes
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Federation</option>
              {federations.map((fed) => (
                <option key={fed.id} value={fed.code}>
                  {fed.country_name || fed.name} ({fed.code})
                </option>
              ))}
            </select>
          </div>

          {/* Discipline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discipline *</label>
            <select
              value={discipline}
              onChange={(e) => {
                setDiscipline(e.target.value);
                setLevel(''); // Reset level when discipline changes
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Discipline</option>
              {BASE_DISCIPLINES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Level */}
          {federationCode && discipline && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level *</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Level</option>
                {(() => {
                  // Group levels by stream
                  const streamGroups: { [key: string]: Level[] } = {};
                  levels.forEach(lvl => {
                    if (!streamGroups[lvl.stream_display]) {
                      streamGroups[lvl.stream_display] = [];
                    }
                    streamGroups[lvl.stream_display].push(lvl);
                  });

                  // Render grouped options
                  return Object.entries(streamGroups).map(([streamName, streamLevels]) => (
                    <optgroup key={streamName} label={streamName}>
                      {streamLevels.map(lvl => (
                        <option key={lvl.id} value={lvl.display_name}>
                          {lvl.display_name}
                        </option>
                      ))}
                    </optgroup>
                  ));
                })()}
              </select>
            </div>
          )}

          {/* Training Site */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Training Site</label>
            <input
              type="text"
              value={trainingSite}
              onChange={(e) => setTrainingSite(e.target.value)}
              placeholder="e.g., Toronto Cricket Club"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Home Club */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Home Club</label>
            <input
              type="text"
              value={homeClub}
              onChange={(e) => setHomeClub(e.target.value)}
              placeholder="e.g., Granite Club"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
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
