'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, signOut } from '../../lib/supabase';
import AddSkaterModal from './add-skater-modal';
import AddTeamModal from './add-team-modal';
import EditSkaterModal from '../../components/EditSkaterModal';
import EditTeamModal from '../../components/EditTeamModal';
import { FederationFlag } from '../../components/FederationFlag';

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

interface Team {
  id: string;
  team_name: string | null;
  partner1_name: string;
  partner2_name: string;
  federation_code: string;
  federation_name: string | null;
  federation_iso_code: string | null;
  country_name: string | null;
  discipline: string;
  current_level: string;
  is_active: boolean;
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

// Helper for Unicode flag emoji
const getFlagEmoji = (isoCode: string | null): string => {
  if (!isoCode) return '';
  const codePoints = isoCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export default function RosterPage() {
  const [skaters, setSkaters] = useState<Skater[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [skaterToEdit, setSkaterToEdit] = useState<Skater | null>(null);
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const router = useRouter();

  const fetchSkaters = async (token: string) => {
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

  const fetchTeams = async (token: string) => {
    const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

    try {
        const res = await fetch(`${api_url}/teams/?active_only=false&limit=1000`, {
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
            setTeams(data);
        }
    } catch (e) {
        console.error("Failed to fetch teams", e);
    }
  };

  const handleArchive = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

    try {
        const res = await fetch(`${api_url}/skaters/${id}/archive`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });
        if (res.ok) fetchSkaters(session.access_token);
    } catch (e) { console.error(e); }
  };

  const handleRestore = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

    try {
        const res = await fetch(`${api_url}/skaters/${id}/restore`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });
        if (res.ok) fetchSkaters(session.access_token);
    } catch (e) { console.error(e); }
  };

  const handleArchiveTeam = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

    try {
        const res = await fetch(`${api_url}/teams/${id}/archive`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });
        if (res.ok) fetchTeams(session.access_token);
    } catch (e) { console.error(e); }
  };

  const handleRestoreTeam = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

    try {
        const res = await fetch(`${api_url}/teams/${id}/restore`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });
        if (res.ok) fetchTeams(session.access_token);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    // Wait for Supabase to load session from localStorage before checking auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
        return;
      }
      // Session loaded successfully, now fetch data
      setLoading(false);
      fetchSkaters(session.access_token);
      fetchTeams(session.access_token);
    });

    // Listen for auth state changes (logout, session expiry, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      }
    });

    // Cleanup listener on unmount
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="p-8">Loading Roster...</div>;

  const activeSkaters = skaters.filter(s => s.is_active);
  const archivedSkaters = skaters.filter(s => !s.is_active);

  const SkaterTable = ({ data, isArchived }: { data: Skater[], isArchived?: boolean }) => (
    <div className={`overflow-hidden bg-card shadow sm:rounded-lg ${isArchived ? 'opacity-60' : ''}`}>
        <table className="min-w-full divide-y divide-border">
            <thead className="bg-secondary">
            <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-muted-foreground uppercase">Name</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-muted-foreground uppercase">Federation/Country</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-muted-foreground uppercase">Age</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-muted-foreground uppercase">Discipline</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-muted-foreground uppercase">Level</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-muted-foreground uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-muted-foreground uppercase">Actions</th>
            </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
            {data.length === 0 && (
                <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-muted-foreground">
                        No skaters found.
                    </td>
                </tr>
            )}
            {data.map((skater) => (
                <tr key={skater.id} className="cursor-pointer hover:bg-secondary" onClick={() => router.push(`/dashboard/skaters/${skater.id}`)}>
                    <td className="px-6 py-4 text-sm font-medium text-foreground whitespace-nowrap">{skater.full_name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {skater.federation_iso_code && (
                            <span className="flex items-center gap-2">
                                <FederationFlag iso_code={skater.federation_iso_code} size="small" />
                                <span>{skater.country_name || skater.federation_name}</span>
                            </span>
                        )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {calculateAge(skater.dob) || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">{skater.discipline}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">{skater.current_level}</td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${skater.is_active ? 'bg-green-100 text-green-800' : 'bg-secondary text-foreground'}`}>
                            {skater.is_active ? 'Active' : 'Archived'}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-left">
                        <div className="flex gap-3">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSkaterToEdit(skater);
                                    setIsEditModalOpen(true);
                                }}
                                className="text-primary hover:text-primary/90 font-medium"
                            >
                                Edit
                            </button>
                            {isArchived ? (
                                <button onClick={(e) => { e.stopPropagation(); handleRestore(skater.id); }} className="text-green-600 hover:text-green-900 font-medium">Unarchive</button>
                            ) : (
                                <button onClick={(e) => { e.stopPropagation(); handleArchive(skater.id); }} className="text-red-600 hover:text-red-900 font-medium">Archive</button>
                            )}
                        </div>
                    </td>
                </tr>
            ))}
            </tbody>
        </table>
    </div>
  );

  const activeTeams = teams.filter(t => t.is_active);
  const archivedTeams = teams.filter(t => !t.is_active);

  const TeamsTable = ({ data, isArchived }: { data: Team[], isArchived?: boolean }) => (
    <div className={`overflow-hidden bg-card shadow sm:rounded-lg ${isArchived ? 'opacity-60' : ''}`}>
        <table className="min-w-full divide-y divide-border">
            <thead className="bg-secondary">
            <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-muted-foreground uppercase">Team</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-muted-foreground uppercase">Federation/Country</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-muted-foreground uppercase">Discipline</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-muted-foreground uppercase">Level</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-muted-foreground uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-muted-foreground uppercase">Actions</th>
            </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
            {data.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">
                        No teams found.
                    </td>
                </tr>
            )}
            {data.map((team) => (
                <tr key={team.id} className="hover:bg-secondary">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {team.partner1_name} / {team.partner2_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {team.federation_iso_code && (
                            <span className="flex items-center gap-2">
                                <FederationFlag iso_code={team.federation_iso_code} size="small" />
                                <span>{team.country_name || team.federation_name}</span>
                            </span>
                        )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {team.discipline === 'Ice_Dance' ? 'Ice Dance' : 'Pairs'}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">{team.current_level}</td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${team.is_active ? 'bg-green-100 text-green-800' : 'bg-secondary text-foreground'}`}>
                            {team.is_active ? 'Active' : 'Archived'}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-left">
                        <div className="flex gap-3">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setTeamToEdit(team);
                                    setIsEditTeamModalOpen(true);
                                }}
                                className="text-primary hover:text-primary/90 font-medium"
                            >
                                Edit
                            </button>
                            {isArchived ? (
                                <button onClick={(e) => { e.stopPropagation(); handleRestoreTeam(team.id); }} className="text-green-600 hover:text-green-900 font-medium">Unarchive</button>
                            ) : (
                                <button onClick={(e) => { e.stopPropagation(); handleArchiveTeam(team.id); }} className="text-red-600 hover:text-red-900 font-medium">Archive</button>
                            )}
                        </div>
                    </td>
                </tr>
            ))}
            </tbody>
        </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary">
      <nav className="bg-card shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <span className="text-xl font-bold text-foreground">SkatePlan</span>
              <div className="flex space-x-4">
                <button
                  onClick={() => router.push('/dashboard/roster')}
                  className="text-sm font-medium text-primary hover:text-primary/90"
                >
                  Roster
                </button>
                <button
                  onClick={() => router.push('/dashboard/library')}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Library
                </button>
                <button
                  onClick={() => router.push('/dashboard/benchmarks')}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
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
                    className="text-sm text-muted-foreground hover:text-foreground"
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
            <h1 className="text-3xl font-bold leading-tight text-foreground">Active Skaters</h1>
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
                <h2 className="text-2xl font-bold leading-tight text-muted-foreground mb-6">Archived Skaters</h2>
                <SkaterTable data={archivedSkaters} isArchived />
            </div>
          )}

          {/* Teams Section */}
          <div className="mt-16">
            <hr className="mb-8 border-gray-300" />
            <div className="flex justify-between mb-6">
              <h2 className="text-3xl font-bold leading-tight text-foreground">Active Ice Dance / Pairs Teams</h2>
              <button
                  onClick={() => setIsTeamModalOpen(true)}
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                + Add Dance/Pair Team
              </button>
            </div>

            <TeamsTable data={activeTeams} />

            {archivedTeams.length > 0 && (
              <div className="mt-12">
                  <hr className="mb-8 border-gray-300" />
                  <h2 className="text-2xl font-bold leading-tight text-muted-foreground mb-6">Archived Teams</h2>
                  <TeamsTable data={archivedTeams} isArchived />
              </div>
            )}
          </div>
        </div>
      </main>
      
      <AddSkaterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            fetchSkaters(session.access_token);
          }
        }}
      />

      <AddTeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onSuccess={async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            fetchTeams(session.access_token);
          }
        }}
      />

      {skaterToEdit && (
        <EditSkaterModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSkaterToEdit(null);
          }}
          onSuccess={async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              fetchSkaters(session.access_token);
            }
          }}
          skater={skaterToEdit}
        />
      )}

      {teamToEdit && (
        <EditTeamModal
          isOpen={isEditTeamModalOpen}
          onClose={() => {
            setIsEditTeamModalOpen(false);
            setTeamToEdit(null);
          }}
          onSuccess={async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              fetchTeams(session.access_token);
            }
            setIsEditTeamModalOpen(false);
            setTeamToEdit(null);
          }}
          team={teamToEdit}
        />
      )}
    </div>
  );
}