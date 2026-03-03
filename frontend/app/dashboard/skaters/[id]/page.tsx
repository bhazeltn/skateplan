'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getAuthToken } from '../../../lib/supabase';
import AssetsGallery from '../../../components/AssetsGallery';
import EditSkaterModal from '../../../components/EditSkaterModal';
import { FederationFlag } from '../../../components/FederationFlag';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/Tabs';
import { SkaterOverview } from '../../../components/SkaterOverview';
import GapAnalysisView from '../../../components/gap-analysis/GapAnalysisView';
import EquipmentList from '../../../components/equipment/EquipmentList';

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

  // Overview stats
  const [benchmarkCount, setBenchmarkCount] = useState(0);
  const [recentSessionCount, setRecentSessionCount] = useState(0);
  const [assetCount, setAssetCount] = useState(0);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  // Gap Analysis state
  const [gapAnalysis, setGapAnalysis] = useState<any>(null);
  const [loadingGap, setLoadingGap] = useState(true);

  const fetchSkater = async () => {
    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

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

  const fetchOverview = async () => {
    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

      const res = await fetch(`${api_url}/skaters/${skaterId}/overview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setBenchmarkCount(data.stats.active_benchmarks);
        setRecentSessionCount(data.stats.recent_sessions_count);
        setAssetCount(data.stats.asset_count);
        setRecentSessions(data.recent_sessions);
      }
    } catch (err) {
      console.error('Error fetching overview:', err);
      // Don't set error here - overview is optional, skater data is more important
    }
  };

  const fetchGapAnalysis = async () => {
    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

      const res = await fetch(`${api_url}/skaters/${skaterId}/gap-analysis`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setGapAnalysis(data);
      }
    } catch (err) {
      console.error('Error fetching gap analysis:', err);
    } finally {
      setLoadingGap(false);
    }
  };

  useEffect(() => {
    fetchSkater();
    fetchOverview();
    fetchGapAnalysis();
  }, [skaterId]);

  // Calculate if gap analysis is stale (>330 days = ~11 months)
  const isGapStale = gapAnalysis && gapAnalysis.entries?.length > 0 &&
    (new Date().getTime() - new Date(gapAnalysis.last_updated).getTime()) / (1000 * 60 * 60 * 24) > 330;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <p className="text-muted-foreground">Loading skater profile...</p>
      </div>
    );
  }

  if (error || !skater) {
    return (
      <div className="min-h-screen bg-background p-6">
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
    <div className="min-h-screen bg-background">
      <nav className="bg-card shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              {skater.federation_iso_code && (
                <FederationFlag iso_code={skater.federation_iso_code} size="medium" />
              )}
              <div>
                <span className="text-xl font-bold text-foreground">{skater.full_name}</span>
                {!loadingGap && (
                  <div className="flex gap-2 mt-1">
                    {!gapAnalysis?.entries?.length && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        No Gap Analysis
                      </span>
                    )}
                    {isGapStale && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Gap Analysis Needs Update (11+ months old)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard/roster')}
                className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-secondary"
              >
                ← Back to Roster
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-10">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="gap-analysis">Gap Analysis</TabsTrigger>
              <TabsTrigger value="equipment">Equipment</TabsTrigger>
              <TabsTrigger value="assets">Assets</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <SkaterOverview
                skater={skater}
                benchmarkCount={benchmarkCount}
                recentSessionCount={recentSessionCount}
                assetCount={assetCount}
                recentSessions={recentSessions}
                onEditProfile={() => setIsEditModalOpen(true)}
                onUploadAsset={() => {
                  // TODO: Navigate to assets tab or open upload modal
                  console.log('Upload asset clicked');
                }}
              />
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <div className="bg-card rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground">Profile Details</h2>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-secondary flex items-center gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit Profile
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                    <p className="mt-1 text-sm text-foreground">{skater.full_name}</p>
                  </div>

                  {/* Email */}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="mt-1 text-sm text-foreground">{skater.email}</p>
                  </div>

                  {/* Date of Birth */}
                  {skater.dob && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                      <p className="mt-1 text-sm text-foreground">
                        {new Date(skater.dob).toLocaleDateString()} ({age} years old)
                      </p>
                    </div>
                  )}

                  {/* Discipline */}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Discipline</p>
                    <p className="mt-1 text-sm text-foreground">{skater.discipline}</p>
                  </div>

                  {/* Current Level */}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Current Level</p>
                    <p className="mt-1 text-sm text-foreground">{skater.current_level || 'Not set'}</p>
                  </div>

                  {/* Federation */}
                  {skater.federation_code && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Federation</p>
                      <div className="mt-1 flex items-center gap-2">
                        {skater.federation_iso_code && (
                          <FederationFlag iso_code={skater.federation_iso_code} size="small" />
                        )}
                        <span className="text-sm text-foreground">
                          {skater.country_name || skater.federation_name} ({skater.federation_code})
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Training Site */}
                  {skater.training_site && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Training Site</p>
                      <p className="mt-1 text-sm text-foreground">{skater.training_site}</p>
                    </div>
                  )}

                  {/* Home Club */}
                  {skater.home_club && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Home Club</p>
                      <p className="mt-1 text-sm text-foreground">{skater.home_club}</p>
                    </div>
                  )}

                  {/* Active Status */}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <p className="mt-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          skater.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-secondary text-foreground'
                        }`}
                      >
                        {skater.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Gap Analysis Tab */}
            <TabsContent value="gap-analysis">
              <GapAnalysisView skaterId={skaterId} editable={true} />
            </TabsContent>

            {/* Equipment Tab */}
            <TabsContent value="equipment">
              <EquipmentList skaterId={skaterId} />
            </TabsContent>

            {/* Assets Tab */}
            <TabsContent value="assets">
              <AssetsGallery skaterId={skaterId} />
            </TabsContent>
          </Tabs>
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
