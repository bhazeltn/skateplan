import type { SessionOut } from "@/lib/trainingApi";
import type { YearlyPlanOut, YtpPhaseOut } from "@/lib/ytpApi";

// Canonical strings confirmed from the backend in Phase 0:
//  - session_type: "on_ice" (backend test) + its "off_ice" counterpart.
//  - outcome: "clean" / "fall" / "step_out" (backend test + training_service).
// NOTE: backend total_ice_minutes sums ALL session types (no type filter); the
// on-ice/off-ice split below is a frontend presentation detail.
export const SESSION_TYPES = ["on_ice", "off_ice"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const ATTEMPT_OUTCOMES = ["clean", "fall", "step_out"] as const;
export type AttemptOutcome = (typeof ATTEMPT_OUTCOMES)[number];

export const SESSION_TYPE_LABELS: Record<string, string> = {
  on_ice: "On-Ice",
  off_ice: "Off-Ice",
};

export const OUTCOME_LABELS: Record<string, string> = {
  clean: "Clean",
  fall: "Fall",
  step_out: "Step-Out",
};

export const sessionTypeLabel = (t: string): string => SESSION_TYPE_LABELS[t] ?? t;
export const outcomeLabel = (o: string): string => OUTCOME_LABELS[o] ?? o;

export interface WeekRange {
  startIso: string;
  endIso: string;
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday–Sunday span containing `now`, as YYYY-MM-DD strings (local time). */
export function getCurrentWeekRange(now: Date = new Date()): WeekRange {
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffToMonday = (base.getDay() + 6) % 7; // Sun(0)->6, Mon(1)->0, ...
  const monday = new Date(base);
  monday.setDate(base.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { startIso: toIso(monday), endIso: toIso(sunday) };
}

/** First YTP phase (across all plans) whose inclusive date range contains
 *  `todayIso`, or null if none is active. */
export function findActivePhase(
  plans: YearlyPlanOut[],
  todayIso: string
): YtpPhaseOut | null {
  for (const plan of plans) {
    for (const phase of plan.phases) {
      if (phase.start_date <= todayIso && todayIso <= phase.end_date) {
        return phase;
      }
    }
  }
  return null;
}

export interface WeeklyLoad {
  onIceMinutes: number;
  offIceMinutes: number;
  sessionCount: number;
  avgRpe: number;
}

/** Aggregates sessions falling within `week`: on-ice vs off-ice minutes,
 *  session count and average RPE (1 dp). off_ice is the only "off" bucket;
 *  everything else counts as on-ice. Returns zeroes (never NaN) when empty. */
export function summarizeWeeklyLoad(
  sessions: SessionOut[],
  week: WeekRange
): WeeklyLoad {
  const inWeek = sessions.filter(
    (s) =>
      s.session_date != null &&
      s.session_date >= week.startIso &&
      s.session_date <= week.endIso
  );
  let onIceMinutes = 0;
  let offIceMinutes = 0;
  let rpeSum = 0;
  for (const s of inWeek) {
    if (s.session_type === "off_ice") offIceMinutes += s.duration_minutes;
    else onIceMinutes += s.duration_minutes;
    rpeSum += s.rpe;
  }
  const avgRpe = inWeek.length
    ? Math.round((rpeSum / inWeek.length) * 10) / 10
    : 0;
  return { onIceMinutes, offIceMinutes, sessionCount: inWeek.length, avgRpe };
}

/** New array of sessions ordered by session_date descending; dateless last.
 *  Never mutates the input. */
export function sortSessionsNewestFirst(sessions: SessionOut[]): SessionOut[] {
  return [...sessions].sort((a, b) => {
    const ad = a.session_date ?? "";
    const bd = b.session_date ?? "";
    if (ad === bd) return 0;
    if (!ad) return 1;
    if (!bd) return -1;
    return ad < bd ? 1 : -1;
  });
}
