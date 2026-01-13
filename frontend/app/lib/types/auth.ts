/**
 * TypeScript type definitions for authentication
 */

export interface SignupData {
  email: string
  password: string
  full_name: string
  role?: 'coach' | 'skater' | 'admin' | 'guardian'
}

export interface SigninData {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
  role: string
  full_name?: string
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  user: AuthUser
}
