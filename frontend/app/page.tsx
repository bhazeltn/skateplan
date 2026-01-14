/**
 * Homepage - Auth-Aware Redirect
 *
 * The root path (/) redirects based on authentication state:
 * - Authenticated users → /dashboard/roster
 * - Unauthenticated users → /login
 *
 * This replaces the old test page that showed the elements list.
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './lib/supabase';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check authentication state and redirect accordingly
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // User is authenticated → redirect to dashboard
        router.push('/dashboard/roster');
      } else {
        // User is not authenticated → redirect to login
        router.push('/login');
      }
    });
  }, [router]);

  // Show loading state while checking auth
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            Loading...
          </span>
        </div>
        <p className="mt-4 text-sm text-gray-600">Loading SkatePlan...</p>
      </div>
    </div>
  );
}
