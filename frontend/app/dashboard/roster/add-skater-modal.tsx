'use client';

import { useState } from 'react';

interface AddSkaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSkaterModal({ isOpen, onClose, onSuccess }: AddSkaterModalProps) {
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [level, setLevel] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const token = localStorage.getItem('token');
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

    } catch (err: any) {
      setError(err.message);
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
              className="w-full px-3 py-2 border rounded"
              value={fullName} onChange={e => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <input 
              type="date" required 
              className="w-full px-3 py-2 border rounded"
              value={dob} onChange={e => setDob(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Level</label>
            <select 
                className="w-full px-3 py-2 border rounded"
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
