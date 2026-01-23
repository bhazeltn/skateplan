'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated, signOut } from '../lib/supabase';
import ThemeToggle from '../components/ThemeToggle';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        router.push('/login');
      } else {
        setAuthorized(true);
      }
      setChecking(false);
    }
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Checking authorization...</p>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Shared Dashboard Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-xl font-bold text-foreground hover:text-primary">
                SkatePlan
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link href="/dashboard/roster" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Roster
                </Link>
                <Link href="/dashboard/teams" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Teams
                </Link>
                <Link href="/dashboard/benchmarks/metrics" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Metrics
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      {children}
    </div>
  );
}
