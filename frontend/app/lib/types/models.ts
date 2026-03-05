/**
 * Domain model type definitions
 *
 * These represent the application's domain models and business logic types.
 */

import { UUID } from './api';

// User roles
export type UserRole = 'skater' | 'coach' | 'admin' | 'guardian';

// Profile (unified user model)
export interface Profile {
  id: UUID;
  role: UserRole;
  full_name: string;
  email: string;
  home_club: string | null;
  dob: Date | null;
  level: string | null;
  is_active: boolean;
  is_adaptive: boolean;
  training_site: string | null;
  federation: 'ISU' | 'USFS' | 'SC' | 'OTHER' | null;
  isu_level_anchor: 'NOVICE' | 'JUNIOR' | 'SENIOR' | null;
  active_disciplines: string[];
}

// Partnership (Pairs/Dance/Synchro)
export interface Partnership {
  id: UUID;
  skater_a_id: UUID;
  skater_b_id: UUID;
  discipline: 'PAIRS' | 'ICE_DANCE' | 'SYNCHRO';
  team_level: string | null;
  created_at: Date;
  is_active: boolean;
}

// Coach-Skater link
export interface SkaterCoachLink {
  id: UUID;
  skater_id: UUID;
  coach_id: UUID;
  permission_level: 'view' | 'edit';
  is_primary: boolean;
  created_at: Date;
  status: 'active' | 'pending' | 'archived';
}

// Guardian-Skater link
export interface GuardianLink {
  id: UUID;
  guardian_id: UUID;
  skater_id: UUID;
  status: 'pending' | 'active';
}

// Competition level
export type CompetitionLevel =
  | 'Star 1' | 'Star 2' | 'Star 3' | 'Star 4' | 'Star 5'
  | 'Juvenile' | 'Pre-Novice' | 'Novice' | 'Junior' | 'Senior';

// Asset types
export type AssetType = 'music' | 'costume' | 'choreography' | 'video' | 'technical';

// Equipment types
export type EquipmentType = 'boot' | 'blade';

export interface Equipment {
  id: UUID;
  skater_id: UUID;
  name: string | null;
  type: EquipmentType;
  brand: string;
  model: string;
  size: string;
  purchase_date: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Maintenance types
export type MaintenanceType =
  | 'sharpening'
  | 'mounting'
  | 'waterproofing'
  | 'repair'
  | 'replacement'
  | 'other';

export interface MaintenanceLog {
  id: UUID;
  equipment_id: UUID;
  date: string;
  maintenance_type: MaintenanceType;
  location: string;
  technician: string | null;
  specifications: string | null;
  notes: string | null;
  created_at: Date;
}

// Form state types
export interface SkaterFormData {
  full_name: string;
  dob: string;
  level: CompetitionLevel;
  is_active: boolean;
}

export interface ProfileFormData {
  full_name: string;
  email: string;
  home_club: string;
  training_site: string;
  federation: Profile['federation'];
}

export interface EquipmentFormData {
  name: string | null;
  type: EquipmentType;
  brand: string;
  model: string;
  size: string;
  purchase_date: string | null;
  is_active: boolean;
}

export interface MaintenanceFormData {
  date: string;
  maintenance_type: MaintenanceType;
  location: string;
  technician: string | null;
  specifications: string | null;
  notes: string | null;
}

// Skate Setup types
export interface SkateSetupCreate {
  name: string;
  boot_id: string;
  blade_id: string;
  is_active?: boolean;
}

export interface SkateSetupRead {
  id: string;
  skater_id: string;
  name: string;
  boot_id: string;
  blade_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SkateSetupUpdate {
  name?: string;
  boot_id?: string;
  blade_id?: string;
  is_active?: boolean;
}
