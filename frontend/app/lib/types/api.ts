/**
 * API response type definitions
 *
 * These types mirror the backend Pydantic schemas for type safety.
 */

// Common types
export type UUID = string;

// Element types (ISU Library)
export interface Element {
  id: UUID;
  code: string;
  name: string;
  category: string;
  base_value: number;
  discipline: string;
}

// Skater/Profile types
export interface SkaterProfile {
  id: UUID;
  full_name: string;
  email: string;
  dob: string | null;
  level: string | null;
  is_active: boolean;
  home_club: string | null;
}

// Benchmark types
export interface BenchmarkTemplate {
  id: UUID;
  name: string;
  created_by_id: UUID;
  created_at: string;
}

export interface MetricDefinition {
  id: UUID;
  template_id: UUID;
  label: string;
  unit: string | null;
  data_type: 'NUMERIC' | 'TEXT' | 'SCALE_1_10';
}

export interface BenchmarkSession {
  id: UUID;
  template_id: UUID;
  skater_id: UUID | null;
  partnership_id: UUID | null;
  recorded_by_id: UUID;
  date: string;
  created_at: string;
}

export interface BenchmarkResult {
  id: UUID;
  session_id: UUID;
  metric_definition_id: UUID;
  value: string;
}

// Program Asset types
export interface ProgramAsset {
  id: UUID;
  skater_id: UUID;
  asset_type: 'music' | 'costume' | 'choreography' | 'video' | 'technical';
  file_path: string;
  uploaded_at: string;
  notes: string | null;
}

// API Error response
export interface ApiError {
  detail: string;
}

// Generic API list response
export interface ApiListResponse<T> {
  items: T[];
  total: number;
}
