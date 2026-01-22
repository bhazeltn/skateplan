'use client';

import { QuickStatsCard } from './QuickStatsCard';
import { FederationFlag } from './FederationFlag';

interface SkaterDetail {
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

interface BenchmarkSession {
  id: string;
  template_name: string;
  recorded_at: string;
  summary: string;
}

interface SkaterOverviewProps {
  skater: SkaterDetail;
  benchmarkCount?: number;
  recentSessionCount?: number;
  assetCount?: number;
  recentSessions?: BenchmarkSession[];
  onEditProfile: () => void;
  onRecordBenchmark?: () => void;
  onUploadAsset?: () => void;
}

export function SkaterOverview({
  skater,
  benchmarkCount = 0,
  recentSessionCount = 0,
  assetCount = 0,
  recentSessions = [],
  onEditProfile,
  onRecordBenchmark,
  onUploadAsset,
}: SkaterOverviewProps) {
  const calculateAge = (birthDate: string | null): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(skater.dob);

  return (
    <div className="space-y-6">
      {/* Profile Summary Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {skater.federation_iso_code && (
              <FederationFlag iso_code={skater.federation_iso_code} size="large" />
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{skater.full_name}</h2>
              <div className="mt-2 flex items-center gap-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {skater.current_level}
                </span>
                <span className="text-sm text-gray-600">{skater.discipline}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onEditProfile}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            Edit Profile
          </button>
        </div>

        {/* Bio Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {age !== null && (
            <div>
              <p className="text-sm font-medium text-gray-500">Age</p>
              <p className="mt-1 text-sm text-gray-900">{age} years old</p>
            </div>
          )}
          {skater.federation_code && (
            <div>
              <p className="text-sm font-medium text-gray-500">Federation</p>
              <p className="mt-1 text-sm text-gray-900">
                {skater.country_name || skater.federation_name} ({skater.federation_code})
              </p>
            </div>
          )}
          {skater.training_site && (
            <div>
              <p className="text-sm font-medium text-gray-500">Training Site</p>
              <p className="mt-1 text-sm text-gray-900">{skater.training_site}</p>
            </div>
          )}
          {skater.home_club && (
            <div>
              <p className="text-sm font-medium text-gray-500">Home Club</p>
              <p className="mt-1 text-sm text-gray-900">{skater.home_club}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickStatsCard
          title="Active Benchmarks"
          value={benchmarkCount}
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
          subtitle="Assigned templates"
        />
        <QuickStatsCard
          title="Recent Tests"
          value={recentSessionCount}
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          subtitle="Last 30 days"
        />
        <QuickStatsCard
          title="Assets"
          value={assetCount}
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          }
          subtitle="Music, visual, technical"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="px-6 py-4">
          {recentSessions.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No recent benchmark results</p>
              <p className="mt-1 text-xs text-gray-400">
                Record your first benchmark session to see activity here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{session.template_name}</p>
                    <p className="text-xs text-gray-500">{session.summary}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <p className="text-xs text-gray-500">
                      {new Date(session.recorded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  View All Benchmarks →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        {onRecordBenchmark && (
          <button
            onClick={onRecordBenchmark}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Record Benchmark Result
          </button>
        )}
        {onUploadAsset && (
          <button
            onClick={onUploadAsset}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Upload Asset
          </button>
        )}
      </div>
    </div>
  );
}
