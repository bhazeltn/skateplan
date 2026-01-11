'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddSkaterModal from './add-skater-modal';

interface Skater {
  id: string;
  full_name: string;
  dob: string;
  level: string;
  is_active: boolean;
}

export default function RosterPage() {
  const [skaters, setSkaters] = useState<Skater[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const fetchSkaters = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        router.push('/login');
        return;
    }

    const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    
    try {
        // Fetch ALL skaters (active and archived) by setting active_only=false
        const res = await fetch(`${api_url}/skaters/?active_only=false&limit=1000`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (res.status === 401) {
            router.push('/login');
            return;
        }
        
        if (res.ok) {
            const data = await res.json();
            setSkaters(data);
        }
    } catch (e) {
        console.error("Failed to fetch skaters", e);
    } finally {
        setLoading(false);
    }
  };

  const handleArchive = async (id: string) => {
    const token = localStorage.getItem('token');
    const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    
    try {
        const res = await fetch(`${api_url}/skaters/${id}/archive`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (res.ok) fetchSkaters();
    } catch (e) { console.error(e); }
  };

  const handleRestore = async (id: string) => {
    const token = localStorage.getItem('token');
    const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    
    try {
        const res = await fetch(`${api_url}/skaters/${id}/restore`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (res.ok) fetchSkaters();
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchSkaters();
  }, []);

  if (loading) return <div className="p-8">Loading Roster...</div>;

  const activeSkaters = skaters.filter(s => s.is_active);
  const archivedSkaters = skaters.filter(s => !s.is_active);

  const SkaterTable = ({ data, isArchived }: { data: Skater[], isArchived?: boolean }) => (
    <div className={`overflow-hidden bg-white shadow sm:rounded-lg ${isArchived ? 'opacity-60' : ''}`}>
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
            <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Level</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">DOB</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Actions</th>
            </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 && (
                <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No skaters found.
                    </td>
                </tr>
            )}
            {data.map((skater) => (
                <tr key={skater.id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{skater.full_name}</td>
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{skater.level}</td>
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{skater.dob}</td>
                <td className="px-6 py-4 text-sm whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${skater.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {skater.is_active ? 'Active' : 'Archived'}
                    </span>
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-left">
                    {isArchived ? (
                        <button onClick={() => handleRestore(skater.id)} className="text-blue-600 hover:text-blue-900 font-medium">Unarchive</button>
                    ) : (
                        <button onClick={() => handleArchive(skater.id)} className="text-red-600 hover:text-red-900 font-medium">Archive</button>
                    )}
                </td>
                </tr>
            ))}
            </tbody>
        </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">SkatePlan Roster</span>
            </div>
            <div className="flex items-center space-x-4">
                <button 
                    onClick={() => {
                        localStorage.removeItem('token');
                        document.cookie = "token=; path=/; max-age=0";
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
          <div className="flex justify-between mb-6">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">Active Skaters</h1>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              + Add Skater
            </button>
          </div>
          
          <SkaterTable data={activeSkaters} />

          {archivedSkaters.length > 0 && (
            <div className="mt-12">
                <hr className="mb-8 border-gray-300" />
                <h2 className="text-2xl font-bold leading-tight text-gray-500 mb-6">Archived Skaters</h2>
                <SkaterTable data={archivedSkaters} isArchived />
            </div>
          )}
        </div>
      </main>
      
      <AddSkaterModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => fetchSkaters()}
      />
    </div>
  );
}