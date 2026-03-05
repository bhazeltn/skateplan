'use client';

import { useState } from 'react';
import { createSkateSetup } from '../../lib/api';
import type { SkateSetupCreate } from '../../lib/types/models';
import type { Equipment } from '../../lib/types/models';

interface CreateSkateSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  skaterId: string;
  equipment: Equipment[];
}

export default function CreateSkateSetupModal({
  isOpen,
  onClose,
  onSuccess,
  skaterId,
  equipment,
}: CreateSkateSetupModalProps) {
  const [name, setName] = useState('');
  const [bootId, setBootId] = useState('');
  const [bladeId, setBladeId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter equipment by type
  const boots = equipment.filter(eq => eq.type === 'boot');
  const blades = equipment.filter(eq => eq.type === 'blade');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!bootId) {
      setError('Please select a boot');
      return;
    }
    if (!bladeId) {
      setError('Please select a blade');
      return;
    }

    setLoading(true);
    try {
      const data: SkateSetupCreate = {
        name: name.trim(),
        boot_id: bootId,
        blade_id: bladeId,
        is_active: isActive,
      };
      await createSkateSetup(skaterId, data);
      onSuccess();
      // Reset form
      setName('');
      setBootId('');
      setBladeId('');
      setIsActive(true);
      setError('');
    } catch (err) {
      console.error('Error creating skate setup:', err);
      setError('Failed to create skate setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b">
          <h3 className="text-xl font-semibold text-gray-900">Build New Skate Setup</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="setup-name" className="block text-sm font-medium text-gray-700 mb-1">
              Setup Name
            </label>
            <input
              type="text"
              id="setup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Competition Skates"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Boot Selection */}
          <div>
            <label htmlFor="boot-select" className="block text-sm font-medium text-gray-700 mb-1">
              Boot
            </label>
            <select
              id="boot-select"
              value={bootId}
              onChange={(e) => setBootId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Select a boot...</option>
              {boots.length === 0 ? (
                <option disabled value="">No boots available</option>
              ) : (
                boots.map((boot) => (
                  <option key={boot.id} value={boot.id}>
                    {boot.name || `${boot.brand} ${boot.model}`} - Size {boot.size}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Blade Selection */}
          <div>
            <label htmlFor="blade-select" className="block text-sm font-medium text-gray-700 mb-1">
              Blade
            </label>
            <select
              id="blade-select"
              value={bladeId}
              onChange={(e) => setBladeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Select a blade...</option>
              {blades.length === 0 ? (
                <option disabled value="">No blades available</option>
              ) : (
                blades.map((blade) => (
                  <option key={blade.id} value={blade.id}>
                    {blade.name || `${blade.brand} ${blade.model}`} - Size {blade.size}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={loading}
            />
            <label htmlFor="is-active" className="ml-2 block text-sm text-gray-700">
              Mark as currently in use
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Setup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
