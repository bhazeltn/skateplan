import { describe, it, expect, vi, afterEach } from 'vitest';
import type {
  Element,
  SkaterProfile,
  BenchmarkTemplate,
  ApiError,
  UUID
} from '../api';

// Import the API functions we're testing
import {
  searchCompetitions,
  createCompetition,
  getSkaterEvents,
  createSkaterEvent
} from '../api';

// Mock global fetch
const originalFetch = globalThis.fetch;

describe('API Type Definitions', () => {
  it('should allow valid Element type', () => {
    const element: Element = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      code: '3Lz',
      name: 'Triple Lutz',
      category: 'jumps',
      base_value: 5.90,
      discipline: 'singles'
    };

    expect(element.code).toBe('3Lz');
    expect(element.base_value).toBe(5.90);
  });

  it('should allow valid SkaterProfile type', () => {
    const skater: SkaterProfile = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      full_name: 'Test Skater',
      email: 'test@example.com',
      dob: '2010-01-01',
      level: 'Junior',
      is_active: true,
      home_club: 'Test Club'
    };

    expect(skater.full_name).toBe('Test Skater');
    expect(skater.is_active).toBe(true);
  });

  it('should allow nullable fields in SkaterProfile', () => {
    const skater: SkaterProfile = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      full_name: 'Test Skater',
      email: 'test@example.com',
      dob: null,
      level: null,
      is_active: true,
      home_club: null
    };

    expect(skater.dob).toBeNull();
    expect(skater.level).toBeNull();
  });

  it('should allow valid BenchmarkTemplate type', () => {
    const template: BenchmarkTemplate = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Off-Ice Fitness',
      created_by_id: '123e4567-e89b-12d3-a456-426614174001',
      created_at: '2024-01-01T00:00:00Z'
    };

    expect(template.name).toBe('Off-Ice Fitness');
  });

  it('should allow valid ApiError type', () => {
    const error: ApiError = {
      detail: 'Not found'
    };

    expect(error.detail).toBe('Not found');
  });

  it('should enforce UUID type as string', () => {
    const uuid: UUID = '123e4567-e89b-12d3-a456-426614174000';
    expect(typeof uuid).toBe('string');
  });
});

describe('API Client Functions', () => {
  afterEach(() => {
    if (globalThis.fetch !== originalFetch) {
      globalThis.fetch = originalFetch;
    }
    vi.restoreAllMocks();
  });

  it('searchCompetitions should call GET /api/v1/competitions/?q= with Authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });

    // @ts-ignore - mocking global fetch for testing
    globalThis.fetch = mockFetch;

    // Import and call the function
    const api = (await import('../api'));
    // Note: Since the function doesn't exist yet, we're testing the contract
    // When implemented, it should call:
    // fetch('http://localhost:8000/api/v1/competitions/?q=Sunsational', {
    //   method: 'GET',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer fake-token' }
    // })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/competitions/?q=Sunsational'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Authorization': 'Bearer fake-token'
        })
      })
    );
  });

  it('createCompetition should call POST /api/v1/competitions/ with data and Authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '123', name: 'Test' })
    });

    // @ts-ignore
    globalThis.fetch = mockFetch;

    // When implemented, it should call:
    // fetch('http://localhost:8000/api/v1/competitions/', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer fake-token' },
    //   body: JSON.stringify(mockData)
    // })

    const mockData = {
      name: 'Test Competition',
      start_date: '2026-04-17',
      end_date: '2026-04-19'
    };

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/competitions/'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer fake-token'
        })
      })
    );
  });

  it('getSkaterEvents should call GET /api/v1/skaters/{id}/events with Authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });

    // @ts-ignore
    globalThis.fetch = mockFetch;

    // When implemented, it should call:
    // fetch('http://localhost:8000/api/v1/skaters/skater-123/events', {
    //   method: 'GET',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer fake-token' }
    // })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/skaters/skater-123/events'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Authorization': 'Bearer fake-token'
        })
      })
    );
  });

  it('createSkaterEvent should call POST /api/v1/skaters/{id}/events with data and Authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '123', event_type: 'SIMULATION' })
    });

    // @ts-ignore
    globalThis.fetch = mockFetch;

    const mockData = {
      event_type: 'SIMULATION',
      name: 'Test Event',
      start_date: '2026-05-15',
      end_date: '2026-05-15'
    };

    // When implemented, it should call:
    // fetch('http://localhost:8000/api/v1/skaters/skater-123/events', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer fake-token' },
    //   body: JSON.stringify(mockData)
    // })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/skaters/skater-123/events'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer fake-token'
        })
      })
    );
  });
});
