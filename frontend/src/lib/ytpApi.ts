import { ApiError } from "@/lib/api";

// Yearly Training Plan (YTP) client. Mirrors the live backend under
// /api/skaters/{id}/ytp and /api/ytp/*. Dedicated module (like benchmarkSetsApi.ts)
// reusing the Bearer-token fetch convention. Types match backend schemas/ytp.py.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export type PhaseType =
  | "general_prep"
  | "specific_prep"
  | "pre_comp"
  | "competition"
  | "taper"
  | "transition";

export type IntensityLevel = "low" | "moderate" | "high" | "peak";

export interface YtpPhaseOut {
  id: string;
  plan_id: string;
  name: string;
  phase_type: PhaseType;
  start_date: string;
  end_date: string;
  target_on_ice_hours_per_week?: number | null;
  target_off_ice_hours_per_week?: number | null;
  target_rpe?: number | null;
  intensity_level?: IntensityLevel | null;
  primary_focus?: string | null;
  notes?: string | null;
  benchmark_ids: string[];
}

export interface YtpPhaseCreate {
  name: string;
  phase_type: PhaseType;
  start_date: string;
  end_date: string;
  target_on_ice_hours_per_week?: number | null;
  target_off_ice_hours_per_week?: number | null;
  target_rpe?: number | null;
  intensity_level?: IntensityLevel | null;
  primary_focus?: string | null;
  notes?: string | null;
  benchmark_ids?: string[];
}

export type YtpPhaseUpdate = Partial<YtpPhaseCreate>;

export interface YearlyPlanOut {
  id: string;
  skater_id: number;
  season_label: string;
  title: string;
  start_date: string;
  end_date: string;
  primary_goal?: string | null;
  notes?: string | null;
  created_at: string;
  phases: YtpPhaseOut[];
}

export interface YearlyPlanCreate {
  season_label: string;
  title: string;
  start_date: string;
  end_date: string;
  primary_goal?: string | null;
  notes?: string | null;
}

export type YearlyPlanUpdate = Partial<YearlyPlanCreate>;

async function send<T>(
  path: string,
  options: RequestInit,
  token?: string | null
): Promise<T> {
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

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export function listYearlyPlans(skaterId: number | string, token?: string | null) {
  return send<YearlyPlanOut[]>(`/api/skaters/${skaterId}/ytp`, {}, token);
}

export function createYearlyPlan(
  skaterId: number | string,
  payload: YearlyPlanCreate,
  token?: string | null
) {
  return send<YearlyPlanOut>(`/api/skaters/${skaterId}/ytp`, json("POST", payload), token);
}

export function updateYearlyPlan(
  planId: string,
  payload: YearlyPlanUpdate,
  token?: string | null
) {
  return send<YearlyPlanOut>(`/api/ytp/plans/${planId}`, json("PATCH", payload), token);
}

export function deleteYearlyPlan(planId: string, token?: string | null) {
  return send<void>(`/api/ytp/plans/${planId}`, { method: "DELETE" }, token);
}

export function createYtpPhase(
  planId: string,
  payload: YtpPhaseCreate,
  token?: string | null
) {
  return send<YtpPhaseOut>(`/api/ytp/plans/${planId}/phases`, json("POST", payload), token);
}

export function updateYtpPhase(
  phaseId: string,
  payload: YtpPhaseUpdate,
  token?: string | null
) {
  return send<YtpPhaseOut>(`/api/ytp/phases/${phaseId}`, json("PATCH", payload), token);
}

export function deleteYtpPhase(phaseId: string, token?: string | null) {
  return send<void>(`/api/ytp/phases/${phaseId}`, { method: "DELETE" }, token);
}
