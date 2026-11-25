import { ApiError } from "@/lib/api";

// Training logs & attempt-tracking client (Sprint 4). Dedicated module mirroring
// the live backend under /api/sessions, /api/skaters/{id}/sessions and
// /api/skaters/{id}/training/metrics. Reuses the Bearer-token fetch convention
// (see ytpApi.ts). Types match backend schemas/training.py exactly.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export interface SessionCreate {
  skater_id: number;
  session_date?: string | null;
  session_type: string;
  duration_minutes: number;
  rpe: number;
  location?: string | null;
  notes?: string | null;
}

export type SessionUpdate = Partial<Omit<SessionCreate, "skater_id">>;

export interface SessionOut {
  id: string;
  skater_id: number;
  logged_by_user_id?: number | null;
  session_date?: string | null;
  session_type: string;
  duration_minutes: number;
  rpe: number;
  location?: string | null;
  notes?: string | null;
}

export interface AttemptIn {
  element_code: string;
  outcome: string;
  attempts_count?: number;
  notes?: string | null;
  tags?: string[];
}

export type AttemptUpdate = Partial<AttemptIn>;

export interface AttemptOut {
  id: string;
  session_id: string;
  element_code: string;
  outcome: string;
  attempts_count: number;
  notes?: string | null;
  tags: string[];
}

export interface ElementStatOut {
  element_code: string;
  total_attempts: number;
  clean_count: number;
  clean_percentage: number;
  with_calls_count: number;
  completed_percentage: number;
  tag_counts: Record<string, number>;
}

export interface MetricsOut {
  skater_id: number;
  total_ice_minutes: number;
  session_count: number;
  workload_index: number;
  average_rpe: number;
  element_stats: ElementStatOut[];
}

export interface SessionFilters {
  session_type?: string;
  start_date?: string;
  end_date?: string;
}

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

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== "");
  return entries.length ? `?${new URLSearchParams(entries as [string, string][])}` : "";
}

export function listSkaterSessions(
  skaterId: number | string,
  token?: string | null,
  filters?: SessionFilters
) {
  return send<SessionOut[]>(
    `/api/skaters/${skaterId}/sessions${qs({ ...filters })}`,
    {},
    token
  );
}

export function createSession(payload: SessionCreate, token?: string | null) {
  return send<SessionOut>(`/api/sessions`, json("POST", payload), token);
}

export function updateSession(
  sessionId: string,
  payload: SessionUpdate,
  token?: string | null
) {
  return send<SessionOut>(`/api/sessions/${sessionId}`, json("PATCH", payload), token);
}

export function deleteSession(sessionId: string, token?: string | null) {
  return send<void>(`/api/sessions/${sessionId}`, { method: "DELETE" }, token);
}

export function listSessionAttempts(sessionId: string, token?: string | null) {
  return send<AttemptOut[]>(`/api/sessions/${sessionId}/attempts`, {}, token);
}

export function logSessionAttempts(
  sessionId: string,
  payload: AttemptIn | AttemptIn[],
  token?: string | null
) {
  return send<AttemptOut[]>(
    `/api/sessions/${sessionId}/attempts`,
    json("POST", payload),
    token
  );
}

export function updateSessionAttempt(
  sessionId: string,
  attemptId: string,
  payload: AttemptUpdate,
  token?: string | null
) {
  return send<AttemptOut>(
    `/api/sessions/${sessionId}/attempts/${attemptId}`,
    json("PATCH", payload),
    token
  );
}

export function deleteSessionAttempt(
  sessionId: string,
  attemptId: string,
  token?: string | null
) {
  return send<void>(
    `/api/sessions/${sessionId}/attempts/${attemptId}`,
    { method: "DELETE" },
    token
  );
}

export function getTrainingMetrics(
  skaterId: number | string,
  token?: string | null,
  range?: { start_date?: string; end_date?: string }
) {
  return send<MetricsOut>(
    `/api/skaters/${skaterId}/training/metrics${qs({ ...range })}`,
    {},
    token
  );
}
