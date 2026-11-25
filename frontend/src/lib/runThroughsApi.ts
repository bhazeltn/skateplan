import { ApiError } from "@/lib/api";

// Program run-through tracking + consistency client. Types mirror backend
// schemas/run_through.py exactly. Reuses the Bearer-token fetch convention.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export type RunType = "full" | "half" | "section" | "walkthrough";

export interface RunThroughElementIn {
  element_order?: number;
  element_code: string;
  outcome: string;
  notes?: string | null;
}

export interface RunThroughElementOut {
  id: string;
  element_order: number;
  element_code: string;
  outcome: string;
  notes?: string | null;
}

export interface RunThroughCreate {
  program_id: string;
  run_type?: RunType;
  with_music?: boolean;
  notes?: string | null;
  element_results?: RunThroughElementIn[];
}

export interface RunThroughUpdate {
  run_type?: RunType;
  with_music?: boolean;
  notes?: string | null;
  element_results?: RunThroughElementIn[] | null;
}

export interface RunThroughOut {
  id: string;
  session_id: string;
  program_id: string;
  program_name: string;
  program_segment: string;
  run_type: string;
  with_music: boolean;
  notes?: string | null;
  created_at: string;
  element_results: RunThroughElementOut[];
}

export interface ProgramElementStatOut {
  element_code: string;
  total_attempts: number;
  clean_count: number;
  clean_percentage: number;
}

export interface ProgramConsistencyOut {
  program_id: string;
  program_name: string;
  segment: string;
  total_runs: number;
  full_runs: number;
  clean_runs: number;
  overall_clean_percentage: number;
  element_stats: ProgramElementStatOut[];
}

export interface ProgramStatsFilters {
  start_date?: string;
  end_date?: string;
  program_id?: string;
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

export function listSessionRunThroughs(sessionId: string, token?: string | null) {
  return send<RunThroughOut[]>(`/api/sessions/${sessionId}/run-throughs`, {}, token);
}

export function createRunThrough(
  sessionId: string,
  payload: RunThroughCreate,
  token?: string | null
) {
  const p = `/api/sessions/${sessionId}/run-throughs`;
  return send<RunThroughOut>(p, json("POST", payload), token);
}

export function updateRunThrough(
  sessionId: string,
  runId: string,
  payload: RunThroughUpdate,
  token?: string | null
) {
  const p = `/api/sessions/${sessionId}/run-throughs/${runId}`;
  return send<RunThroughOut>(p, json("PATCH", payload), token);
}

export function deleteRunThrough(
  sessionId: string,
  runId: string,
  token?: string | null
) {
  const p = `/api/sessions/${sessionId}/run-throughs/${runId}`;
  return send<void>(p, { method: "DELETE" }, token);
}

export function getProgramStats(
  skaterId: number | string,
  token?: string | null,
  filters?: ProgramStatsFilters
) {
  const p = `/api/skaters/${skaterId}/training/program-stats${qs({ ...filters })}`;
  return send<ProgramConsistencyOut[]>(p, {}, token);
}
