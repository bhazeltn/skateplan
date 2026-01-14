/**
 * Next.js Middleware - DISABLED
 *
 * This middleware was checking for a 'token' cookie that doesn't exist
 * with Supabase auth. Supabase stores sessions in localStorage and uses
 * different cookie patterns (sb-*-auth-token).
 *
 * Authentication is now handled directly in page components via:
 * - supabase.auth.getSession() - waits for session to load from localStorage
 * - supabase.auth.onAuthStateChange() - handles auth state changes
 *
 * The middleware was causing redirect loops:
 * 1. User logs in → session stored in localStorage
 * 2. Redirect to /dashboard starts
 * 3. Middleware runs → checks for 'token' cookie → not found
 * 4. Middleware redirects back to /login
 * 5. Infinite loop
 *
 * Fix: Disabled middleware. Auth is properly handled in components.
 *
 * See: frontend/app/dashboard/roster/page.tsx for the correct pattern
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Middleware disabled - authentication is handled in page components
  // with proper Supabase session loading via useEffect hooks
  return NextResponse.next();
}

export const config = {
  matcher: '/dashboard/:path*',
};
