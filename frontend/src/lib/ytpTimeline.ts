import { getCurrentSkatingSeason } from "@/lib/competitionBests";
import type { PhaseType } from "@/lib/ytpApi";

// Pure helpers for the YTP timeline: phase styling, season defaults, proportional
// bar/marker positioning, month ticks, week counts and gap-coverage rollups.
// All date math parses "YYYY-MM-DD" as UTC midnight to avoid tz off-by-one.

export interface PhaseMeta {
  label: string;
  bar: string;
  badge: string;
}

export const PHASE_META: Record<PhaseType, PhaseMeta> = {
  general_prep: { label: "General Prep", bar: "bg-sky-500 text-white", badge: "border-sky-300 bg-sky-50 text-sky-700" },
  specific_prep: { label: "Specific Prep", bar: "bg-indigo-500 text-white", badge: "border-indigo-300 bg-indigo-50 text-indigo-700" },
  pre_comp: { label: "Pre-Competition", bar: "bg-amber-500 text-white", badge: "border-amber-300 bg-amber-50 text-amber-700" },
  competition: { label: "Competition", bar: "bg-emerald-600 text-white", badge: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  taper: { label: "Taper", bar: "bg-violet-500 text-white", badge: "border-violet-300 bg-violet-50 text-violet-700" },
  transition: { label: "Transition", bar: "bg-slate-400 text-white", badge: "border-slate-300 bg-slate-100 text-slate-700" },
};

const MS_PER_DAY = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parse an ISO "YYYY-MM-DD" to UTC-midnight ms. */
function ms(dateStr: string): number {
  return Date.parse(`${dateStr}T00:00:00Z`);
}

const clampPct = (n: number): number => Math.min(100, Math.max(0, n));

export interface SeasonRange {
  season_label: string;
  start_date: string;
  end_date: string;
}

/** Current Jul 1 – Jun 30 skating season range (label "YYYY-YY"). */
export function defaultSeasonRange(now: Date = new Date()): SeasonRange {
  const year = now.getUTCFullYear();
  const startYr = now.getUTCMonth() >= 6 ? year : year - 1;
  return {
    season_label: getCurrentSkatingSeason(now),
    start_date: `${startYr}-07-01`,
    end_date: `${startYr + 1}-06-30`,
  };
}

export interface BarPosition {
  leftPct: number;
  widthPct: number;
}

/** Clamped proportional bar within the plan window (percentages 0..100). */
export function computeBarPosition(
  itemStart: string,
  itemEnd: string,
  planStart: string,
  planEnd: string
): BarPosition {
  const total = ms(planEnd) - ms(planStart);
  if (total <= 0) return { leftPct: 0, widthPct: 0 };
  const left = clampPct(((ms(itemStart) - ms(planStart)) / total) * 100);
  const right = clampPct(((ms(itemEnd) - ms(planStart)) / total) * 100);
  return { leftPct: left, widthPct: Math.max(0, right - left) };
}

/** Marker percent for a date within [planStart, planEnd] inclusive, else null. */
export function computeMarkerPosition(
  dateStr: string,
  planStart: string,
  planEnd: string
): number | null {
  const total = ms(planEnd) - ms(planStart);
  if (total <= 0) return null;
  const at = ms(dateStr);
  if (at < ms(planStart) || at > ms(planEnd)) return null;
  return clampPct(((at - ms(planStart)) / total) * 100);
}

export interface MonthTick {
  label: string;
  leftPct: number;
}

/** One tick per month boundary falling inside the plan window. */
export function getMonthTicks(planStart: string, planEnd: string): MonthTick[] {
  const total = ms(planEnd) - ms(planStart);
  if (total <= 0) return [];
  const ticks: MonthTick[] = [];
  const start = new Date(`${planStart}T00:00:00Z`);
  let y = start.getUTCFullYear();
  let m = start.getUTCMonth();
  if (start.getUTCDate() > 1) m += 1; // first whole-month boundary
  for (let guard = 0; guard < 24; guard++) {
    const at = Date.UTC(y + Math.floor(m / 12), m % 12, 1);
    if (at > ms(planEnd)) break;
    ticks.push({ label: MONTHS[m % 12], leftPct: ((at - ms(planStart)) / total) * 100 });
    m += 1;
  }
  return ticks;
}

/** Rounded whole-week count between two ISO dates. */
export function weeksBetween(startStr: string, endStr: string): number {
  return Math.round((ms(endStr) - ms(startStr)) / (7 * MS_PER_DAY));
}

export interface CoverageBenchmark {
  id: string;
  status: string;
}
export interface CoveragePhase {
  name: string;
  benchmark_ids: string[];
}
export interface GapCoverage {
  coverage: Record<string, string[]>;
  targetedCount: number;
  openCount: number;
}

/** Map each open (status!=="MET") benchmark id to the phase names targeting it. */
export function buildGapCoverage(
  benchmarks: CoverageBenchmark[],
  phases: CoveragePhase[]
): GapCoverage {
  const open = benchmarks.filter((b) => b.status !== "MET");
  const coverage: Record<string, string[]> = {};
  let targetedCount = 0;
  for (const b of open) {
    const names = phases.filter((p) => p.benchmark_ids.includes(b.id)).map((p) => p.name);
    coverage[b.id] = names;
    if (names.length > 0) targetedCount += 1;
  }
  return { coverage, targetedCount, openCount: open.length };
}
