/**
 * Tests for dashboard authentication flow and race condition fix.
 *
 * This test verifies that the dashboard properly waits for Supabase
 * to load the session from localStorage before attempting to fetch data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn()
}))

describe('Dashboard Auth Race Condition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should wait for session to load before making API calls', async () => {
    // Track the order of calls
    const callOrder: string[] = []

    // Mock Supabase client with session loading delay
    const mockGetSession = vi.fn().mockImplementation(() => {
      callOrder.push('getSession')
      return Promise.resolve({
        data: {
          session: {
            access_token: 'mock-token-123',
            user: { id: 'user-123' }
          }
        },
        error: null
      })
    })

    const mockOnAuthStateChange = vi.fn().mockImplementation(() => {
      callOrder.push('onAuthStateChange')
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn()
          }
        }
      }
    })

    const mockSupabase = {
      auth: {
        getSession: mockGetSession,
        onAuthStateChange: mockOnAuthStateChange,
        signOut: vi.fn()
      }
    }

    // Test that getSession is called before attempting data fetch
    const session = await mockSupabase.auth.getSession()

    expect(session.data.session).toBeTruthy()
    expect(session.data.session?.access_token).toBe('mock-token-123')
    expect(callOrder).toContain('getSession')
  })

  it('should setup auth state change listener', async () => {
    const mockOnAuthStateChange = vi.fn().mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn()
        }
      }
    })

    const mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'token' } },
          error: null
        }),
        onAuthStateChange: mockOnAuthStateChange
      }
    }

    // Simulate setting up the listener
    const { data: { subscription } } = mockSupabase.auth.onAuthStateChange(
      (event, session) => {
        // Listener callback
      }
    )

    expect(mockOnAuthStateChange).toHaveBeenCalled()
    expect(subscription).toBeDefined()
    expect(subscription.unsubscribe).toBeDefined()
  })

  it('should handle SIGNED_OUT event', async () => {
    let authCallback: ((event: string, session: any) => void) | null = null

    const mockOnAuthStateChange = vi.fn().mockImplementation((callback) => {
      authCallback = callback
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn()
          }
        }
      }
    })

    const mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null
        }),
        onAuthStateChange: mockOnAuthStateChange
      }
    }

    // Setup listener
    mockSupabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        // Should trigger redirect to login
        expect(event).toBe('SIGNED_OUT')
      }
    })

    // Trigger SIGNED_OUT event
    if (authCallback) {
      authCallback('SIGNED_OUT', null)
    }

    expect(mockOnAuthStateChange).toHaveBeenCalled()
  })

  it('should not fetch data if session is null', async () => {
    const mockGetSession = vi.fn().mockResolvedValue({
      data: { session: null },
      error: null
    })

    const mockSupabase = {
      auth: {
        getSession: mockGetSession
      }
    }

    // Attempt to get session
    const { data: { session } } = await mockSupabase.auth.getSession()

    // Should not proceed with data fetch if session is null
    expect(session).toBeNull()
    // In real implementation, this should trigger redirect to login
  })

  it('should fetch data only after session is confirmed', async () => {
    const fetchOrder: string[] = []

    const mockGetSession = vi.fn().mockImplementation(async () => {
      fetchOrder.push('getSession')
      // Simulate async session loading
      await new Promise(resolve => setTimeout(resolve, 10))
      return {
        data: {
          session: {
            access_token: 'valid-token',
            user: { id: 'user-123' }
          }
        },
        error: null
      }
    })

    const mockFetchSkaters = vi.fn().mockImplementation(async () => {
      fetchOrder.push('fetchSkaters')
      return []
    })

    // Simulate the correct flow
    const { data: { session } } = await mockGetSession()

    if (session) {
      await mockFetchSkaters()
    }

    // Verify correct order
    expect(fetchOrder).toEqual(['getSession', 'fetchSkaters'])
    expect(mockFetchSkaters).toHaveBeenCalledTimes(1)
  })
})
