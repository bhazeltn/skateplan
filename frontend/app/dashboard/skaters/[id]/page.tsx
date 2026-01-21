'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getAuthToken } from '../../../lib/supabase';
import AssetsGallery from '../../../components/AssetsGallery';
import EditSkaterModal from '../../../components/EditSkaterModal';
import { FederationFlag } from '../../../components/FederationFlag';

interface Skater {
  id: string;
  full_name: string;
  email: string;
  dob: string | null;
  discipline: string;
  current_level: string;
  is_active: boolean;
  home_club: string | null;
  training_site: string | null;
  federation_code: string | null;
  federation_name: string | null;
  federation_iso_code: string | null;
  country_name: string | null;
}

function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default function SkaterProfilePage() {
  const router = useRouter();
  const params = useParams();
  const skaterId = params.id as string;

  const [skater, setSkater] = useState<Skater | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [error, setError] = useState('');

  const fetchSkater = async () => {
    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';

      const res = await fetch(`${api_url}/skaters/${skaterId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSkater(data);
      } else {
        setError('Failed to load skater profile');
      }
    } catch (err) {
      console.error('Error fetching skater:', err);
      setError('Error loading skater profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkater();
  }, [skaterId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <p className="text-gray-600">Loading skater profile...</p>
      </div>
    );
  }

  if (error || !skater) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || 'Skater not found'}
        </div>
        <button
          onClick={() => router.push('/dashboard/roster')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Roster
        </button>
      </div>
    );
  }

  const age = calculateAge(skater.dob);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">Skater Profile</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-10">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          {/* Profile Header */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-start justify-between">
              {/* Left side - Profile info */}
              <div className="flex items-center gap-4">
                {/* Federation flag */}
                {skater.federation_iso_code && (
                  <FederationFlag iso_code={skater.federation_iso_code} size="large" />
                )}

                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{skater.full_name}</h1>

                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    {/* Discipline */}
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Discipline:</span>
                      <span>{skater.discipline}</span>
                    </div>

                    {/* Level */}
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Level:</span>
                      <span>{skater.current_level || 'Not set'}</span>
                    </div>

                    {/* Age */}
                    {skater.dob && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Age:</span>
                        <span>{age} years old</span>
                        <span className="text-gray-400">
                          (Born: {new Date(skater.dob).toLocaleDateString()})
                        </span>
                      </div>
                    )}

                    {/* Federation */}
                    {skater.federation_code && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Federation:</span>
                        <span>{skater.country_name || skater.federation_name} ({skater.federation_code})</span>
                      </div>
                    )}

                    {/* Training Site */}
                    {skater.training_site && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Training Site:</span>
                        <span>{skater.training_site}</span>
                      </div>
                    )}

                    {/* Home Club */}
                    {skater.home_club && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Home Club:</span>
                        <span>{skater.home_club}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right side - Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit Profile
                </button>

                <button
                  onClick={() => router.push('/dashboard/roster')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  ← Back to Roster
                </button>
              </div>
            </div>
          </div>

          {/* Assets Gallery (Sprint 2 - Keep) */}
          <AssetsGallery skaterId={skaterId} />

          {/* Benchmarks Section (Sprint 5 - Keep) */}
          <div className="bg-white shadow sm:rounded-lg mb-8 mt-8">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Benchmarks & Goals</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="p-4 border rounded-md">
                  <h4 className="font-bold text-gray-800">Pre-Novice Standards</h4>
                  <ul className="mt-2 space-y-2 text-sm text-gray-600">
                    <li className="flex justify-between">
                      <span>Vertical Jump</span>
                      <span className="font-medium text-gray-900">Target: 14"</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Double Axel</span>
                      <span className="font-medium text-gray-900">Target: Consist.</span>
                    </li>
                  </ul>
                </div>
                {/* Placeholder for "Add New Benchmark" */}
                <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-md text-gray-400 cursor-pointer hover:border-blue-500 hover:text-blue-500">
                  + Create New Benchmark Profile
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      <EditSkaterModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        skater={skater}
        onSuccess={() => {
          fetchSkater();
          setIsEditModalOpen(false);
        }}
      />
    </div>
  );
}
