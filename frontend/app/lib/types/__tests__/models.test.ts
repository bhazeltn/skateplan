import { describe, it, expect } from 'vitest';
import type {
  Profile,
  Partnership,
  SkaterCoachLink,
  CompetitionLevel,
  AssetType,
  UserRole
} from '../models';

describe('Model Type Definitions', () => {
  it('should allow valid Profile type', () => {
    const profile: Profile = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      role: 'skater',
      full_name: 'Test Skater',
      email: 'test@example.com',
      home_club: 'Test Club',
      dob: new Date('2010-01-01'),
      level: 'Junior',
      is_active: true,
      is_adaptive: false,
      training_site: 'Test Rink',
      federation: 'USFS',
      isu_level_anchor: 'JUNIOR',
      active_disciplines: ['singles']
    };

    expect(profile.role).toBe('skater');
    expect(profile.federation).toBe('USFS');
  });

  it('should allow valid Partnership type', () => {
    const partnership: Partnership = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      skater_a_id: '123e4567-e89b-12d3-a456-426614174001',
      skater_b_id: '123e4567-e89b-12d3-a456-426614174002',
      discipline: 'PAIRS',
      team_level: 'Junior',
      created_at: new Date(),
      is_active: true
    };

    expect(partnership.discipline).toBe('PAIRS');
    expect(partnership.is_active).toBe(true);
  });

  it('should allow valid SkaterCoachLink type', () => {
    const link: SkaterCoachLink = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      skater_id: '123e4567-e89b-12d3-a456-426614174001',
      coach_id: '123e4567-e89b-12d3-a456-426614174002',
      permission_level: 'edit',
      is_primary: true,
      created_at: new Date(),
      status: 'active'
    };

    expect(link.permission_level).toBe('edit');
    expect(link.status).toBe('active');
  });

  it('should enforce UserRole enum', () => {
    const roles: UserRole[] = ['skater', 'coach', 'admin', 'guardian'];
    expect(roles).toHaveLength(4);
  });

  it('should enforce CompetitionLevel type', () => {
    const level: CompetitionLevel = 'Junior';
    expect(level).toBe('Junior');
  });

  it('should enforce AssetType enum', () => {
    const assetType: AssetType = 'music';
    expect(assetType).toBe('music');
  });
});
