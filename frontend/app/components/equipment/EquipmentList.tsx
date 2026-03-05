'use client';

import { useState, useEffect } from 'react';
import { getAuthToken } from '../../lib/supabase';
import type { Equipment, MaintenanceLog, SkateSetupRead } from '../../lib/types/models';
import { getSkateSetups } from '../../lib/api';
import AddEquipmentModal from './AddEquipmentModal';
import MaintenanceModal from './MaintenanceModal';
import CreateSkateSetupModal from './CreateSkateSetupModal';

interface EquipmentListProps {
  skaterId: string;
}

interface EquipmentWithMaintenance extends Equipment {
  maintenance_logs?: MaintenanceLog[];
}

export default function EquipmentList({ skaterId }: EquipmentListProps) {
  const [equipment, setEquipment] = useState<EquipmentWithMaintenance[]>([]);
  const [skateSetups, setSkateSetups] = useState<SkateSetupRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentWithMaintenance | null>(null);

  const fetchEquipment = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

      const response = await fetch(`${api_url}/skaters/${skaterId}/equipment`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEquipment(data);
      } else {
        setError('Failed to load equipment');
      }
    } catch (err) {
      console.error('Error fetching equipment:', err);
      setError('Error loading equipment');
    } finally {
      setLoading(false);
    }
  };

  const fetchSkateSetups = async () => {
    try {
      const data = await getSkateSetups(skaterId);
      setSkateSetups(data);
    } catch (err) {
      console.error('Error fetching skate setups:', err);
      // Non-fatal error, don't block UI
    }
  };

  // Helper to find equipment by ID
  const findEquipment = (id: string): EquipmentWithMaintenance | undefined => {
    return equipment.find(eq => eq.id === id);
  };

  const handleAddEquipment = () => {
    setIsAddModalOpen(true);
  };

  const handleLogMaintenance = (equipmentItem: EquipmentWithMaintenance) => {
    setSelectedEquipment(equipmentItem);
    setIsMaintenanceModalOpen(true);
  };

  const handleAddModalClose = () => {
    setIsAddModalOpen(false);
  };

  const handleMaintenanceModalClose = () => {
    setIsMaintenanceModalOpen(false);
    setSelectedEquipment(null);
  };

  const handleAddSuccess = () => {
    fetchEquipment();
    fetchSkateSetups();
    setIsAddModalOpen(false);
  };

  const handleMaintenanceSuccess = () => {
    fetchEquipment();
    setIsMaintenanceModalOpen(false);
    setSelectedEquipment(null);
  };

  const handleBuildNewSkate = () => {
    setIsSetupModalOpen(true);
  };

  const handleSetupModalClose = () => {
    setIsSetupModalOpen(false);
  };

  const handleSetupSuccess = () => {
    fetchSkateSetups();
    setIsSetupModalOpen(false);
  };

  useEffect(() => {
    fetchEquipment();
    fetchSkateSetups();
  }, [skaterId]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading equipment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Skates Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Current Skates</h2>
          <button
            onClick={handleBuildNewSkate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2 text-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Build New Skate
          </button>
        </div>
        {skateSetups.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <svg className="mx-auto h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No skate setups found</h3>
            <p className="mt-1 text-sm text-gray-500">Create a skate setup by pairing a boot and blade.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skateSetups.map((setup) => {
              const boot = findEquipment(setup.boot_id);
              const blade = findEquipment(setup.blade_id);
              return (
                <div
                  key={setup.id}
                  data-testid={`skate-setup-${setup.id}`}
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow p-6 border border-blue-200"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{setup.name}</h3>
                      <p className="text-sm text-gray-600">
                        {setup.is_active ? (
                          <span className="text-green-600 font-medium">Currently in use</span>
                        ) : (
                          <span className="text-gray-500">Inactive</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    {/* Boot Info */}
                    <div className="bg-white rounded p-3 border border-blue-100">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-700">Boot:</span>
                          {boot ? (
                            <span className="text-gray-900">{boot.name || `${boot.brand} ${boot.model}`}</span>
                          ) : (
                            <span className="text-red-500 italic">Not found</span>
                          )}
                        </div>
                        {boot && (
                          <button
                            onClick={() => handleLogMaintenance(boot)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Log Maintenance
                          </button>
                        )}
                      </div>
                      {boot && (
                        <div className="text-xs text-gray-600 ml-16">
                          {boot.brand} {boot.model} • Size {boot.size}
                        </div>
                      )}
                    </div>

                    {/* Blade Info */}
                    <div className="bg-white rounded p-3 border border-blue-100">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-700">Blade:</span>
                          {blade ? (
                            <span className="text-gray-900">{blade.name || `${blade.brand} ${blade.model}`}</span>
                          ) : (
                            <span className="text-red-500 italic">Not found</span>
                          )}
                        </div>
                        {blade && (
                          <button
                            onClick={() => handleLogMaintenance(blade)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Log Maintenance
                          </button>
                        )}
                      </div>
                      {blade && (
                        <div className="text-xs text-gray-600 ml-16">
                          {blade.brand} {blade.model} • Size {blade.size}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Equipment Inventory Section */}
      <div className="border-t pt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Equipment Inventory</h2>
          <button
            onClick={handleAddEquipment}
            data-testid="add-equipment-button"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Equipment
          </button>
        </div>

        <div data-testid="equipment-list">
        {equipment.length === 0 ? (
          <div
            data-testid="empty-state"
            className="bg-white rounded-lg shadow p-8 text-center"
          >
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No equipment found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding your first piece of equipment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipment.map((eq) => (
              <div
                key={eq.id}
                data-testid={`equipment-${eq.id}`}
                data-name={eq.name || `${eq.type} - ${eq.brand} ${eq.model}`}
                data-type={eq.type}
                className="bg-white rounded-lg shadow p-6 border border-gray-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {eq.name || `${eq.brand} ${eq.model}`}
                    </h3>
                    {eq.name && (
                      <p className="text-sm text-gray-600">
                        {eq.brand} {eq.model}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      eq.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {eq.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="font-medium capitalize">{eq.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span className="font-medium">{eq.size}</span>
                  </div>
                  {eq.purchase_date && (
                    <div className="flex justify-between">
                      <span>Purchased:</span>
                      <span className="font-medium">
                        {new Date(eq.purchase_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t flex gap-2">
                  <button
                    onClick={() => handleLogMaintenance(eq)}
                    data-testid={`log-maintenance-${eq.id}`}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    Log Maintenance
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Add Equipment Modal */}
      <AddEquipmentModal
        isOpen={isAddModalOpen}
        onClose={handleAddModalClose}
        onSuccess={handleAddSuccess}
        skaterId={skaterId}
      />

      {/* Maintenance Modal */}
      {selectedEquipment && (
        <MaintenanceModal
          isOpen={isMaintenanceModalOpen}
          onClose={handleMaintenanceModalClose}
          onSuccess={handleMaintenanceSuccess}
          equipmentId={selectedEquipment.id}
          equipment={selectedEquipment}
        />
      )}

      {/* Create Skate Setup Modal */}
      <CreateSkateSetupModal
        isOpen={isSetupModalOpen}
        onClose={handleSetupModalClose}
        onSuccess={handleSetupSuccess}
        skaterId={skaterId}
        equipment={equipment}
      />
    </div>
  );
}
