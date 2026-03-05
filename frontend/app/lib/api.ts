/**
 * API helper functions for making authenticated requests to the backend
 */

import { getAuthToken } from './supabase';
import type { SkateSetupCreate, SkateSetupRead, SkateSetupUpdate, Competition, SkaterEvent, EventType } from './types/models';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * Make an authenticated API request
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Redirect to login if unauthorized
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * GET request helper
 */
export async function apiGet(endpoint: string) {
  return apiFetch(endpoint, { method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost(endpoint: string, data: unknown) {
  return apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PUT request helper
 */
export async function apiPut(endpoint: string, data: unknown) {
  return apiFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * PATCH request helper
 */
export async function apiPatch(endpoint: string, data: unknown) {
  return apiFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete(endpoint: string) {
  return apiFetch(endpoint, { method: 'DELETE' });
}

// Specific API functions

/**
 * Fetch ISU elements library
 */
export async function fetchElements() {
  return apiGet('/elements');
}

/**
 * Skate Setup API functions
 */
export async function getSkateSetups(skaterId: string): Promise<SkateSetupRead[]> {
  return apiGet(`/skaters/${skaterId}/skates`);
}

export async function createSkateSetup(skaterId: string, data: SkateSetupCreate): Promise<SkateSetupRead> {
  return apiPost(`/skaters/${skaterId}/skates`, data);
}

export async function updateSkateSetup(skaterId: string, setupId: string, data: SkateSetupUpdate): Promise<SkateSetupRead> {
  return apiPut(`/skaters/${skaterId}/skates/${setupId}`, data);
}

/**
 * Competitions API functions
 */
export async function searchCompetitions(query: string): Promise<Competition[]> {
  return apiGet(`/competitions/?q=${encodeURIComponent(query)}`);
}

export async function createCompetition(data: Partial<Competition>): Promise<Competition> {
  return apiPost('/competitions/', data);
}

/**
 * Skater Events API functions
 */
export async function getSkaterEvents(skaterId: string): Promise<SkaterEvent[]> {
  return apiGet(`/skaters/${skaterId}/events`);
}

export async function createSkaterEvent(skaterId: string, data: Partial<SkaterEvent>): Promise<SkaterEvent> {
  return apiPost(`/skaters/${skaterId}/events`, data);
}
