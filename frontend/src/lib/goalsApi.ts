import { ApiError } from "@/lib/api";

// Skater development-goal client. Mirrors the live backend under
// /api/skaters/{id}/goals*. Types match backend schemas/goal.py exactly
// (thin goal: title/detail/status — distinct from the SMART benchmark system).
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export interface GoalOut {
  id: string;
  skater_id: number;
  title: string;
  detail?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GoalCreate {
  title: string;
  detail?: string | null;
  status?: string;
}

export type GoalUpdate = Partial<GoalCreate>;

async function call<T>(
  path: string,
  options: RequestInit = {},
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

export function listSkaterGoals(
  skaterId: number | string,
  token?: string | null
): Promise<GoalOut[]> {
  return call<GoalOut[]>(`/api/skaters/${skaterId}/goals`, {}, token);
}

export function createSkaterGoal(
  skaterId: number | string,
  payload: GoalCreate,
  token?: string | null
): Promise<GoalOut> {
  return call<GoalOut>(
    `/api/skaters/${skaterId}/goals`,
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}

export function updateSkaterGoal(
  skaterId: number | string,
  goalId: string,
  payload: GoalUpdate,
  token?: string | null
): Promise<GoalOut> {
  return call<GoalOut>(
    `/api/skaters/${skaterId}/goals/${goalId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}

export function deleteSkaterGoal(
  skaterId: number | string,
  goalId: string,
  token?: string | null
): Promise<void> {
  return call<void>(
    `/api/skaters/${skaterId}/goals/${goalId}`,
    { method: "DELETE" },
    token
  );
}
