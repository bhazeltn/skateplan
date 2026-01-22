'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function BenchmarksPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to metrics library by default
    router.push('/dashboard/benchmarks/metrics');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-600">Redirecting to Metric Library...</p>
    </div>
  );
}
