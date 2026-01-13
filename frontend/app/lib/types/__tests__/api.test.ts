import { describe, it, expect } from 'vitest';
import type {
  Element,
  SkaterProfile,
  BenchmarkTemplate,
  ApiError,
  UUID
} from '../api';

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
