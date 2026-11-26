import { ApiError } from "@/lib/api";

// Skater access-management client. Mirrors the live backend under
// /api/skaters/{id}/access* and the public/auth invite + password routes.
// Types match backend schemas/access.py exactly.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export interface SkaterCapabilities {
  role: string | null;
  can_edit_plan: boolean;
  can_edit_goals: boolean;
  can_log_training: boolean;
  can_manage_access: boolean;
}

// GET /access/me returns the caller's resolved capabilities (CapabilityOut).
export type SkaterAccessMeOut = SkaterCapabilities;

export interface CoachAccessOut {
  coach_user_id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  permission_level: string;
}

export interface PendingInviteOut {
  invite_id: string;
  email: string;
  target_role: string;
  expires_at: string;
  accepted_at?: string | null;
}

export interface SkaterAccessSummaryOut {
  coaches: CoachAccessOut[];
  pending_invites: PendingInviteOut[];
}

export interface InviteCreate {
  email: string;
  role: string; // "skater" | "collaborator" | "viewer"
}

export interface InviteResponse {
  status: string; // "linked" | "invited"
  invite_id?: string | null;
  token?: string | null;
  invite_path?: string | null;
  coach_user_id?: number | null;
}

export interface CoachRoleUpdate {
  role: string; // "collaborator" | "viewer"
}

export interface PublicInviteOut {
  email: string;
  target_role: string;
  skater_name?: string | null;
  expires_at: string;
}

export interface AcceptInvitePayload {
  token: string;
  full_name: string;
  password: string;
}

export interface AcceptInviteResponse {
  access_token: string;
  token_type?: string;
  user_id: number;
  role: string;
}

type Id = number | string;

async function call<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new ApiError(res.status, detail?.detail ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function getMySkaterAccess(id: Id, token?: string | null): Promise<SkaterAccessMeOut> {
  return call<SkaterAccessMeOut>(`/api/skaters/${id}/access/me`, {}, token);
}

export function getSkaterAccess(id: Id, token?: string | null): Promise<SkaterAccessSummaryOut> {
  return call<SkaterAccessSummaryOut>(`/api/skaters/${id}/access`, {}, token);
}

export function inviteToSkater(id: Id, payload: InviteCreate, token?: string | null): Promise<InviteResponse> {
  return call<InviteResponse>(`/api/skaters/${id}/access/invites`, { method: "POST", body: JSON.stringify(payload) }, token);
}

export function updateCoachRole(id: Id, coachUserId: number, payload: CoachRoleUpdate, token?: string | null): Promise<CoachAccessOut> {
  return call<CoachAccessOut>(`/api/skaters/${id}/access/coaches/${coachUserId}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}

export function removeCoachAccess(id: Id, coachUserId: number, token?: string | null): Promise<void> {
  return call<void>(`/api/skaters/${id}/access/coaches/${coachUserId}`, { method: "DELETE" }, token);
}

export function revokeInvite(id: Id, inviteId: string, token?: string | null): Promise<void> {
  return call<void>(`/api/skaters/${id}/access/invites/${inviteId}`, { method: "DELETE" }, token);
}

export function getPublicInvite(token: string): Promise<PublicInviteOut> {
  return call<PublicInviteOut>(`/api/auth/invites/${token}`);
}

export function acceptInvite(payload: AcceptInvitePayload): Promise<AcceptInviteResponse> {
  return call<AcceptInviteResponse>("/api/auth/accept-invite", { method: "POST", body: JSON.stringify(payload) });
}

export function changePassword(
  payload: { current_password: string; new_password: string },
  token?: string | null
): Promise<{ status: string }> {
  return call<{ status: string }>("/api/auth/change-password", { method: "POST", body: JSON.stringify(payload) }, token);
}
