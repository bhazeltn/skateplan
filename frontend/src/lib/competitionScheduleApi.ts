import { ApiError } from "@/lib/api";

// Consolidated roster-schedule client. Types mirror the backend
// schemas/competition_schedule.py exactly: competition id and entry_id are
// native UUIDs (JSON strings), skater_id is an integer. Dates are ISO
// "YYYY-MM-DD" or null. Reuses the Bearer-token fetch convention.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export interface RosterEntrySummaryOut {
  entry_id: string;
  skater_id: number;
  skater_name: string;
  level?: string | null;
  status?: string | null;
  overall_score?: number | null;
}

export interface RosterCompetitionOut {
  id: string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  city?: string | null;
  country?: string | null;
  location?: string | null;
  entries: RosterEntrySummaryOut[];
}

// Partial update payload for PATCH /api/competitions/{id}. All optional;
// only supplied fields are changed. city/country feed the derived location.
export interface CompetitionUpdate {
  name?: string;
  start_date?: string | null;
  end_date?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface RosterScheduleOptions {
  skaterId?: number;
  includeEmpty?: boolean;
}

function qs(opts?: RosterScheduleOptions): string {
  const params = new URLSearchParams();
  if (opts?.skaterId != null) params.set("skater_id", String(opts.skaterId));
  if (opts?.includeEmpty) params.set("include_empty", "true");
  const s = params.toString();
  return s ? `?${s}` : "";
}

export async function getRosterCompetitionSchedule(
  token?: string | null,
  opts?: RosterScheduleOptions
): Promise<RosterCompetitionOut[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/api/competitions/roster-schedule${qs(opts)}`, {
    headers,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new ApiError(res.status, detail?.detail ?? "Request failed");
  }
  return (await res.json()) as RosterCompetitionOut[];
}

export async function updateCompetition(
  competitionId: string,
  payload: CompetitionUpdate,
  token?: string | null
): Promise<RosterCompetitionOut> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/api/competitions/${competitionId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new ApiError(res.status, detail?.detail ?? "Update failed");
  }
  return (await res.json()) as RosterCompetitionOut;
}
