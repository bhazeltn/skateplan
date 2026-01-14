'use client';

import { useState, useEffect } from 'react';
import { getAuthToken } from '../../lib/supabase';
import { FederationFlag } from '../../components/FederationFlag';

interface Federation {
  id: string;
  name: string;
  code: string;
  iso_code: string;
}

interface AddSkaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSkaterModal({ isOpen, onClose, onSuccess }: AddSkaterModalProps) {
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [level, setLevel] = useState('');
  const [federationCode, setFederationCode] = useState('ISU');
  const [federations, setFederations] = useState<Federation[]>([]);
  const [error, setError] = useState('');

  // Fetch federations on mount
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const token = await getAuthToken();
    const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

    try {
      const res = await fetch(`${api_url}/skaters/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: fullName,
          dob: dob,
          level: level,
          federation_code: federationCode,
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

      // Success
      onSuccess();
      onClose();
      // Reset form
      setFullName('');
      setDob('');
      setLevel('');
      setFederationCode('ISU');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
        <h3 className="mb-4 text-lg font-bold text-gray-900">Add New Skater</h3>
        {error && <div className="p-2 mb-4 text-sm text-red-700 bg-red-100 rounded">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input 
              type="text" required
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white placeholder:text-gray-400"
              value={fullName} 
              onChange={e => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <input 
              type="date" required 
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white placeholder:text-gray-400"
              value={dob} onChange={e => setDob(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Federation</label>
            <select
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
              value={federationCode}
              onChange={(e) => setFederationCode(e.target.value)}
              required
            >
              <option value="">Select Federation</option>
              {federations.map((fed) => (
                <option key={fed.code} value={fed.code}>
                  {fed.name}
                </option>
              ))}
            </select>
            {federationCode && federations.find(f => f.code === federationCode) && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <FederationFlag
                  iso_code={federations.find(f => f.code === federationCode)!.iso_code}
                  size="small"
                />
                <span>{federations.find(f => f.code === federationCode)!.name}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Level</label>
            <select
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white placeholder:text-gray-400"
                value={level} onChange={e => setLevel(e.target.value)}
                required
            >
                <option value="">Select Level</option>
                <option value="Star 1">Star 1</option>
                <option value="Star 5">Star 5</option>
                <option value="Juvenile">Juvenile</option>
                <option value="Pre-Novice">Pre-Novice</option>
                <option value="Novice">Novice</option>
                <option value="Junior">Junior</option>
                <option value="Senior">Senior</option>
            </select>
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
              Add Skater
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
