'use client';

import { useState, useEffect } from 'react';
import { getAuthToken } from '../../lib/supabase';

interface Skater {
  id: string;
  full_name: string;
  dob: string | null;
  federation_code: string | null;
  federation_name: string | null;
  federation_iso_code: string | null;
  country_name: string | null;
}

interface Federation {
  code: string;
  name: string;
  iso_code: string;
  country_name?: string;
}

interface Level {
  id: string;
  stream_id: string;
  stream_code: string;
  stream_display: string;
  level_name: string;
  display_name: string;
  level_order: number;
  is_adult: boolean;
}

// Helper to calculate age from DOB
const calculateAge = (dobString: string | null): number | null => {
  if (!dobString) return null;
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

interface AddTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddTeamModal({ isOpen, onClose, onSuccess }: AddTeamModalProps) {
  const [skaters, setSkaters] = useState<Skater[]>([]);
  const [skater1, setSkater1] = useState('');
  const [skater2, setSkater2] = useState('');
  const [availableFederations, setAvailableFederations] = useState<Federation[]>([]);
  const [selectedFederation, setSelectedFederation] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [availableLevels, setAvailableLevels] = useState<Level[]>([]);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch coach's skaters on mount
  useEffect(() => {
    const fetchSkaters = async () => {
      if (!isOpen) return;

      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

      try {
        const res = await fetch(`${api_url}/skaters/?active_only=true`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setSkaters(data);
        }
      } catch (error) {
        console.error('Error loading skaters:', error);
      }
    };

    fetchSkaters();
  }, [isOpen]);

  // When both skaters selected, determine available federations
  useEffect(() => {
    if (skater1 && skater2) {
      const s1 = skaters.find(s => s.id === skater1);
      const s2 = skaters.find(s => s.id === skater2);

      if (!s1 || !s2) return;

      // Smart federation selection
      if (s1.federation_code === s2.federation_code) {
        // Same federation - auto-select
        const federations = [{
          code: s1.federation_code || '',
          name: s1.federation_name || '',
          iso_code: s1.federation_iso_code || '',
          country_name: s1.country_name || undefined
        }];
        setAvailableFederations(federations);
        setSelectedFederation(s1.federation_code || '');
      } else {
        // Different federations - allow choice between the two
        const federations = [
          {
            code: s1.federation_code || '',
            name: s1.federation_name || '',
            iso_code: s1.federation_iso_code || '',
            country_name: s1.country_name || undefined
          },
          {
            code: s2.federation_code || '',
            name: s2.federation_name || '',
            iso_code: s2.federation_iso_code || '',
            country_name: s2.country_name || undefined
          }
        ];
        setAvailableFederations(federations);
        setSelectedFederation(''); // User must choose
      }
    } else {
      setAvailableFederations([]);
      setSelectedFederation('');
    }
  }, [skater1, skater2, skaters]);

  // When federation and discipline selected, load levels
  useEffect(() => {
    const loadLevels = async () => {
      if (!selectedFederation || !discipline || !skater1 || !skater2) return;

      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

      try {
        // Get both skaters to check ages
        const s1 = skaters.find(s => s.id === skater1);
        const s2 = skaters.find(s => s.id === skater2);

        if (!s1 || !s2) return;

        // Calculate ages for both athletes
        const age1 = calculateAge(s1.dob);
        const age2 = calculateAge(s2.dob);

        // Both must be adults (>= 18) to see adult levels
        const bothAreAdults = (age1 !== null && age1 >= 18) && (age2 !== null && age2 >= 18);

        // Use new team-levels endpoint that returns ALL streams
        const res = await fetch(
          `${api_url}/federations/${selectedFederation}/team-levels?discipline=${discipline}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (res.ok) {
          const data: Level[] = await res.json();

          // Filter out adult levels if both athletes aren't adults
          const filteredLevels = bothAreAdults
            ? data  // Show all levels including adult
            : data.filter(level => !level.is_adult);  // Hide adult levels

          setAvailableLevels(filteredLevels);
        }
      } catch (error) {
        console.error('Error loading levels:', error);
      }
    };

    loadLevels();
  }, [selectedFederation, discipline, skater1, skater2, skaters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const token = await getAuthToken();
    const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

    try {
      const selectedLevelObj = availableLevels.find(l => l.id === selectedLevel);

      const res = await fetch(`${api_url}/teams/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          skater1_id: skater1,
          skater2_id: skater2,
          federation_code: selectedFederation,
          discipline: discipline,
          current_level: selectedLevelObj?.level_name || selectedLevel
        })
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Unauthorized. Please login again.');
        }
        if (res.status === 422) {
          throw new Error('Validation Error. Check your inputs.');
        }
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to create team');
      }

      // Success - reset form and close
      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSkater1('');
    setSkater2('');
    setAvailableFederations([]);
    setSelectedFederation('');
    setDiscipline('');
    setAvailableLevels([]);
    setSelectedLevel('');
    setError('');
  };

  if (!isOpen) return null;

  const sameFederation = availableFederations.length === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Add Ice Dance / Pairs Team</h2>

        {error && <div className="p-2 mb-4 text-sm text-red-700 bg-red-100 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Partner 1 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Partner 1 <span className="text-red-500">*</span>
            </label>
            <select
              value={skater1}
              onChange={(e) => setSkater1(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select skater</option>
              {skaters.map(s => (
                <option key={s.id} value={s.id} disabled={s.id === skater2}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Partner 2 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Partner 2 <span className="text-red-500">*</span>
            </label>
            <select
              value={skater2}
              onChange={(e) => setSkater2(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select skater</option>
              {skaters.map(s => (
                <option key={s.id} value={s.id} disabled={s.id === skater1}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Federation - smart selection based on skaters */}
          {availableFederations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Federation <span className="text-red-500">*</span>
              </label>
              {sameFederation ? (
                <div className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-300">
                  <span className="text-sm font-medium text-gray-900">
                    {availableFederations[0].country_name || availableFederations[0].name} ({availableFederations[0].code})
                  </span>
                  <p className="mt-1 text-xs text-gray-500">
                    Both skaters are from the same federation
                  </p>
                </div>
              ) : (
                <>
                  <select
                    value={selectedFederation}
                    onChange={(e) => setSelectedFederation(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select federation</option>
                    {availableFederations.map(f => (
                      <option key={f.code} value={f.code}>
                        {f.country_name || f.name} ({f.code})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Partners are from different federations. Select which federation this team represents.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Discipline - Pairs or Ice_Dance only */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Discipline <span className="text-red-500">*</span>
            </label>
            <select
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              required
              disabled={!selectedFederation}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select discipline</option>
              <option value="Pairs">Pairs</option>
              <option value="Ice_Dance">Ice Dance</option>
            </select>
          </div>

          {/* Level - grouped by stream */}
          {discipline && selectedFederation && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Level <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select level</option>
                {(() => {
                  // Group levels by stream
                  const streamGroups: { [key: string]: Level[] } = {};
                  availableLevels.forEach(level => {
                    if (!streamGroups[level.stream_display]) {
                      streamGroups[level.stream_display] = [];
                    }
                    streamGroups[level.stream_display].push(level);
                  });

                  // Render grouped options
                  return Object.entries(streamGroups).map(([streamName, levels]) => (
                    <optgroup key={streamName} label={streamName}>
                      {levels.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.display_name}
                        </option>
                      ))}
                    </optgroup>
                  ));
                })()}
              </select>
              {availableLevels.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  No levels available for this combination. Try selecting both athletes first.
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading || !skater1 || !skater2 || !selectedFederation || !discipline || !selectedLevel}
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Team'}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
