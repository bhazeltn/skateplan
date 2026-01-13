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
