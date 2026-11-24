import { ApiError } from "@/lib/api";

// Coach-owned reusable benchmark sets (Sprint 7). Mirrors the live backend under
// /api/benchmark-sets. Kept in a dedicated module so the oversized api.ts stays
// untouched; reuses the same Bearer-token fetch convention.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export interface BenchmarkSetItemIn {
  category: string;
  title: string;
  notes?: string | null;
  sort_order?: number;
}

export interface BenchmarkSetItemOut {
  id: string;
  category: string;
  title: string;
  notes: string | null;
  sort_order: number;
}

export interface BenchmarkSetOut {
  id: string;
  coach_id: number;
  name: string;
  description: string | null;
  created_at: string;
  items: BenchmarkSetItemOut[];
}

export interface BenchmarkSetCreate {
  name: string;
  description?: string | null;
  items?: BenchmarkSetItemIn[];
}

export interface BenchmarkSetUpdate {
  name?: string;
  description?: string | null;
  items?: BenchmarkSetItemIn[];
}

export interface ApplySetResult {
  created_count: number;
  skipped_count: number;
  created_items: { category: string; title: string }[];
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

// GET /api/benchmark-sets — the current coach's sets (each with items).
export function listBenchmarkSets(
  token?: string | null
): Promise<BenchmarkSetOut[]> {
  return send<BenchmarkSetOut[]>("/api/benchmark-sets", {}, token);
}

// POST /api/benchmark-sets — create a set.
export function createBenchmarkSet(
  payload: BenchmarkSetCreate,
  token?: string | null
): Promise<BenchmarkSetOut> {
  return send<BenchmarkSetOut>(
    "/api/benchmark-sets",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}

// PATCH /api/benchmark-sets/{setId} — update name/description and/or items.
export function updateBenchmarkSet(
  setId: string,
  payload: BenchmarkSetUpdate,
  token?: string | null
): Promise<BenchmarkSetOut> {
  return send<BenchmarkSetOut>(
    `/api/benchmark-sets/${setId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}

// DELETE /api/benchmark-sets/{setId} — 204 No Content.
export function deleteBenchmarkSet(
  setId: string,
  token?: string | null
): Promise<void> {
  return send<void>(`/api/benchmark-sets/${setId}`, { method: "DELETE" }, token);
}

// POST /api/benchmark-sets/{setId}/apply/{skaterId} — copy items to a skater.
export function applyBenchmarkSet(
  setId: string,
  skaterId: number | string,
  token?: string | null
): Promise<ApplySetResult> {
  return send<ApplySetResult>(
    `/api/benchmark-sets/${setId}/apply/${skaterId}`,
    { method: "POST" },
    token
  );
}
