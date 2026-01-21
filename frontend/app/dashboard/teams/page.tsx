'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken, signOut } from '../../lib/supabase';
import AddTeamModal from './add-team-modal';

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

export default function TeamsPage() {
  const router = useRouter();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPartnerships = async () => {
    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

      const res = await fetch(`${api_url}/partnerships/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setPartnerships(data);
      } else {
        setError('Failed to load teams');
      }
    } catch (err) {
      console.error('Error fetching partnerships:', err);
      setError('Error loading teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartnerships();
  }, []);

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team?')) {
      return;
    }

    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

      const res = await fetch(`${api_url}/partnerships/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        // Refresh list
        fetchPartnerships();
      } else {
        alert('Failed to delete team');
      }
    } catch (err) {
      console.error('Error deleting partnership:', err);
      alert('Error deleting team');
    }
  };

  const formatDiscipline = (discipline: string) => {
    const map: Record<string, string> = {
      'PAIRS': 'Pairs',
      'ICE_DANCE': 'Ice Dance',
      'SYNCHRO': 'Synchronized'
    };
    return map[discipline] || discipline;
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Loading teams...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <span className="text-xl font-bold text-gray-900">SkatePlan</span>
              <div className="flex space-x-4">
                <button
                  onClick={() => router.push('/dashboard/roster')}
                  className="text-sm font-medium text-gray-500 hover:text-gray-900"
                >
                  Roster
                </button>
                <button
                  onClick={() => router.push('/dashboard/teams')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-900"
                >
                  Teams
                </button>
                <button
                  onClick={() => router.push('/dashboard/library')}
                  className="text-sm font-medium text-gray-500 hover:text-gray-900"
                >
                  Library
                </button>
                <button
                  onClick={() => router.push('/dashboard/benchmarks')}
                  className="text-sm font-medium text-gray-500 hover:text-gray-900"
                >
                  Benchmarks
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
                <button
                    onClick={async () => {
                        await signOut();
                        router.push('/login');
                    }}
                    className="text-sm text-gray-500 hover:text-gray-900"
                >
                    Logout
                </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-10">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          + Add Team
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {partnerships.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">No teams yet</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
          >
            Create Your First Team
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {partnerships.map((team) => (
            <div
              key={team.id}
              onClick={() => router.push(`/dashboard/teams/${team.id}`)}
              className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="inline-block px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded">
                    {formatDiscipline(team.discipline)}
                  </span>
                  {team.team_level && (
                    <span className="ml-2 text-sm text-gray-600">
                      {team.team_level}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTeam(team.id);
                  }}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-gray-900 font-medium">{team.skater_a_name}</p>
                <p className="text-gray-900 font-medium">{team.skater_b_name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddTeamModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchPartnerships();
        }}
      />
        </div>
      </main>
    </div>
  );
}
