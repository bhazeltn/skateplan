'use client';

import { useState, useEffect } from 'react';
import { getAuthToken } from '../../lib/supabase';
import { FederationFlag } from '../../components/FederationFlag';

interface Federation {
  id: string;
  name: string;
  code: string;
  iso_code: string;
  country_name?: string;
}

interface Level {
  id: string;
  stream_id: string;
  stream_code: string;
  stream_display: string;
  federation_code: string;
  discipline: string;
  level_name: string;
  display_name: string;
  level_order: number;
  is_adult: boolean;
  is_system: boolean;
  isu_anchor: string | null;
  source: string;  // "federation", "fallback", "isi", "custom"
}

interface CountryOption {
  code: string;
  name: string;
  is_separator: boolean;
}

interface AddSkaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Helper for flag emoji
const getCountryFlag = (isoCode: string) => {
  return isoCode
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
};

export default function AddSkaterModal({ isOpen, onClose, onSuccess }: AddSkaterModalProps) {
  // State
  const [systemType, setSystemType] = useState<'ISU' | 'ISI'>('ISU');
  const [federations, setFederations] = useState<Federation[]>([]);
  const [federationCode, setFederationCode] = useState('');
  const [isiCountry, setIsiCountry] = useState('');  // NEW: ISI country tracking
  const [countries, setCountries] = useState<CountryOption[]>([]);  // NEW: Comprehensive country list
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [availableDisciplines, setAvailableDisciplines] = useState<{value: string, label: string}[]>([]);
  const [discipline, setDiscipline] = useState('');
  const [includeISI, setIncludeISI] = useState(false);
  const [levels, setLevels] = useState<Level[]>([]);
  const [level, setLevel] = useState('');
  const [customLevelName, setCustomLevelName] = useState('');
  const [trainingSite, setTrainingSite] = useState('');
  const [homeClub, setHomeClub] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // PERMANENT RULES - DO NOT CHANGE:
  // 1. Singles and Solo_Dance: ALWAYS show (base disciplines for solo skaters)
  // 2. Artistic: Show ONLY if federation has Artistic data
  // 3. NEVER show: Pairs, Ice_Dance, Synchro (require partners/teams)
  const BASE_DISCIPLINES = [
    { value: 'Singles', label: 'Singles / Freeskating' },
    { value: 'Solo_Dance', label: 'Solo Dance' }
  ];

  // Handle system type change
  const handleSystemTypeChange = (type: 'ISU' | 'ISI') => {
    setSystemType(type);
    if (type === 'ISI') {
      setFederationCode('ISI');
      setIncludeISI(false);  // Don't need ISI toggle when in ISI mode
      setIsiCountry('');  // Reset ISI country
    } else {
      setFederationCode('');
      setIncludeISI(false);
      setIsiCountry('');
    }
    // Reset downstream selections
    setDiscipline('');
    setLevel('');
    setCustomLevelName('');
  };

  // Fetch ISU-based federations on mount (excludes ISI and UNIVERSAL)
  useEffect(() => {
    const fetchFederations = async () => {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

      try {
        const res = await fetch(`${api_url}/federations/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          // Backend already sorts by country_name
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

  // Fetch comprehensive country list on mount
  useEffect(() => {
    const fetchCountries = async () => {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

      try {
        const res = await fetch(`${api_url}/federations/countries`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setCountries(data);
        }
      } catch (err) {
        console.error('Failed to fetch countries:', err);
      }
    };

    if (isOpen) {
      fetchCountries();
    }
  }, [isOpen]);

  // When federation changes, determine available disciplines
  // CRITICAL: Always show Singles and Solo_Dance (base disciplines)
  // Only show Artistic if federation has Artistic data
  useEffect(() => {
    const fetchAvailableDisciplines = async () => {
      if (!federationCode) {
        setAvailableDisciplines([]);
        return;
      }

      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

      try {
        // Use new disciplines endpoint
        const res = await fetch(`${api_url}/federations/${federationCode}/disciplines`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const federationDisciplines: string[] = await res.json();

          // Start with base disciplines (always available for solo skaters)
          let available = [...BASE_DISCIPLINES];

          // Add Artistic if federation has it
          if (federationDisciplines.includes('Artistic')) {
            available.push({ value: 'Artistic', label: 'Artistic' });
          }

          setAvailableDisciplines(available);
        } else {
          // If API fails, fallback to base disciplines
          console.error('Failed to fetch disciplines, using base disciplines');
          setAvailableDisciplines(BASE_DISCIPLINES);
        }
      } catch (err) {
        console.error('Error fetching disciplines:', err);
        // Fallback to base disciplines on error
        setAvailableDisciplines(BASE_DISCIPLINES);
      }

      // Reset downstream selections
      setDiscipline('');
      setLevel('');
      setCustomLevelName('');
    };

    fetchAvailableDisciplines();
  }, [federationCode]);

  // Fetch levels when discipline, dob, or ISI toggle changes
  useEffect(() => {
    const fetchLevels = async () => {
      if (!federationCode || !discipline || !dob) return;

      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

      // Use new API endpoint with fallback logic
      const url = `${api_url}/federations/${federationCode}/levels?discipline=${discipline}&skater_dob=${dob}&include_isi=${includeISI}`;

      try {
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setLevels(data);
          // Reset level selection when filters change
          setLevel('');
          setCustomLevelName('');
        }
      } catch (err) {
        console.error('Failed to fetch levels:', err);
      }
    };

    fetchLevels();
  }, [federationCode, discipline, dob, includeISI]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const token = await getAuthToken();
    const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

    // Determine final level value
    let finalLevel = level;
    if (level === 'Other' && customLevelName.trim()) {
      finalLevel = customLevelName.trim();
    }

    // Validate level
    if (!finalLevel || finalLevel === 'Other') {
      setError('Please enter a custom level name');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${api_url}/skaters/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: fullName,
          dob: dob,
          federation_code: federationCode,
          discipline: discipline,
          current_level: finalLevel,
          training_site: trainingSite || null,
          home_club: homeClub || null,
          is_active: true
        })
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Unauthorized. Please login again.');
        }
        if (res.status === 422) {
          throw new Error('Validation Error. Check your inputs.');
        }
        throw new Error('Failed to create skater');
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
    setSystemType('ISU');
    setFederationCode('');
    setIsiCountry('');
    setFullName('');
    setDob('');
    setAvailableDisciplines([]);
    setDiscipline('');
    setIncludeISI(false);
    setLevels([]);
    setLevel('');
    setCustomLevelName('');
    setTrainingSite('');
    setHomeClub('');
    setError('');
  };

  if (!isOpen) return null;

  const selectedFederation = federations.find(f => f.code === federationCode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Add Skater</h2>

        {error && <div className="p-2 mb-4 text-sm text-red-700 bg-red-100 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. SYSTEM TYPE TOGGLE - ISU-based vs ISI */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Federation System <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="systemType"
                  value="ISU"
                  checked={systemType === 'ISU'}
                  onChange={() => handleSystemTypeChange('ISU')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">ISU-Based (ISU, CAN, USA, PHI)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="systemType"
                  value="ISI"
                  checked={systemType === 'ISI'}
                  onChange={() => handleSystemTypeChange('ISI')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">ISI (Ice Skating Institute)</span>
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {systemType === 'ISU' ? 'ISU-based federations use Novice/Junior/Senior levels' : 'ISI uses numbered levels (1-10)'}
            </p>
          </div>

          {/* 2. FEDERATION - Only for ISU-based systems */}
          {systemType === 'ISU' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Federation <span className="text-red-500">*</span>
              </label>
              <select
                value={federationCode}
                onChange={(e) => setFederationCode(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select federation...</option>
                {federations.map(fed => (
                  <option key={fed.code} value={fed.code}>
                    {getCountryFlag(fed.iso_code)} {fed.country_name || fed.name} ({fed.name})
                  </option>
                ))}
              </select>
              {selectedFederation && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded">
                  <FederationFlag
                    iso_code={selectedFederation.iso_code}
                    size="small"
                  />
                  <span className="text-sm font-medium text-gray-900">{selectedFederation.name}</span>
                </div>
              )}
            </div>
          )}

          {systemType === 'ISI' && (
            <>
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-900">
                  <strong>ISI (Ice Skating Institute)</strong> selected. ISI uses numbered levels (Freestyle 1-10, Ice Dancing 1-10, etc.)
                </p>
              </div>

              {/* ISI Country Dropdown - ISI is global */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  value={isiCountry}
                  onChange={(e) => setIsiCountry(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select country...</option>
                  {countries.map((country, idx) => (
                    country.is_separator ? (
                      <option key={idx} disabled className="text-gray-400">
                        {country.name}
                      </option>
                    ) : (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    )
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  ISI is used worldwide - select the country where this skater trains
                </p>
              </div>
            </>
          )}

          {/* 2. Personal Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 3. DISCIPLINE - Filtered by federation */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Discipline <span className="text-red-500">*</span>
            </label>
            <select
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              required
              disabled={!federationCode}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select discipline...</option>
              {availableDisciplines.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              What discipline are you coaching this skater in?
            </p>
            {!federationCode && (
              <p className="mt-1 text-xs text-gray-500">Select federation first</p>
            )}
          </div>

          {/* 4. ISI Toggle - Only show for ISU-based systems */}
          {systemType === 'ISU' && federationCode && discipline && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="include-isi"
                checked={includeISI}
                onChange={(e) => setIncludeISI(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="include-isi" className="text-sm text-gray-700">
                Also show ISI levels
              </label>
              <span className="text-xs text-gray-500">(ISI levels will be prefixed with "ISI:")</span>
            </div>
          )}

          {/* 5. LEVEL - Filtered by discipline + federation + age */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Current Level <span className="text-red-500">*</span>
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              required
              disabled={!discipline || !dob}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select level...</option>
              {levels.map(lvl => (
                <option key={lvl.id} value={lvl.level_name} title={lvl.source === 'fallback' ? `Fallback from ${lvl.federation_code}` : undefined}>
                  {lvl.display_name}
                </option>
              ))}
            </select>
            {levels.some(l => l.source === 'fallback') && (() => {
              const fallbackLevel = levels.find(l => l.source === 'fallback');
              const fallbackCode = fallbackLevel?.federation_code;
              const fallbackName = fallbackCode === 'ISU' ? 'ISU Standard' : fallbackCode === 'UNIVERSAL' ? 'Universal Adult' : fallbackCode;
              const selectedFed = federations.find(f => f.code === federationCode);
              const fedName = selectedFed?.name || federationCode;

              return (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-900">
                    <strong>ℹ️ Using {fallbackName} Levels</strong>
                  </p>
                  <p className="mt-1 text-xs text-blue-800">
                    {fedName} doesn't have {discipline} levels in our system yet. We're showing {fallbackName} levels as a substitute.
                  </p>
                  <p className="mt-2 text-xs text-blue-800">
                    Want to add {fedName}'s {discipline} levels? <a
                      href={`mailto:support@skateplan.com?subject=Add ${discipline} levels for ${fedName}&body=Hi! I'd like to request adding ${discipline} levels for ${fedName}.%0A%0AFederation Code: ${federationCode}%0ADiscipline: ${discipline}%0A%0AThank you!`}
                      className="underline font-medium hover:text-blue-600"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Contact us
                    </a>
                  </p>
                </div>
              );
            })()}
            {(!discipline || !dob) && (
              <p className="mt-1 text-xs text-gray-500">
                Select discipline and date of birth first
              </p>
            )}
          </div>

          {/* Custom level input if "Other" selected */}
          {level === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Custom Level Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customLevelName}
                onChange={(e) => setCustomLevelName(e.target.value)}
                required
                placeholder="Enter custom level name"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* 6. Training Site and Home Club */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Training Site</label>
            <input
              type="text"
              value={trainingSite}
              onChange={(e) => setTrainingSite(e.target.value)}
              placeholder="e.g., WinSport Arena, Ice Palace"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Home Club</label>
            <input
              type="text"
              value={homeClub}
              onChange={(e) => setHomeClub(e.target.value)}
              placeholder="e.g., Calgary Skating Club"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Skater'}
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
