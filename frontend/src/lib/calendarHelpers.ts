import type { RosterCompetitionOut } from "@/lib/competitionScheduleApi";

// Pure calendar/date helpers for the competition schedule views. ISO dates are
// "YYYY-MM-DD"; lexicographic string comparison is used for day comparisons
// (tz-safe) and Date.UTC for grid arithmetic (avoids tz off-by-one).

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export interface PartitionedCompetitions {
  upcoming: RosterCompetitionOut[];
  past: RosterCompetitionOut[];
  undated: RosterCompetitionOut[];
}

export interface DayCell {
  iso: string;
  day: number;
  inMonth: boolean;
}

/** Effective last day of a competition: end_date when set, else start_date. */
function effectiveEnd(c: RosterCompetitionOut): string {
  return (c.end_date || c.start_date) as string;
}

const byStartAsc = (a: RosterCompetitionOut, b: RosterCompetitionOut): number =>
  (a.start_date || "").localeCompare(b.start_date || "");

/** Split competitions into upcoming (end >= today, asc), past (desc), undated. */
export function partitionCompetitions(
  items: RosterCompetitionOut[],
  todayIso: string
): PartitionedCompetitions {
  const upcoming: RosterCompetitionOut[] = [];
  const past: RosterCompetitionOut[] = [];
  const undated: RosterCompetitionOut[] = [];
  for (const c of items) {
    if (!c.start_date) undated.push(c);
    else if (effectiveEnd(c) >= todayIso) upcoming.push(c);
    else past.push(c);
  }
  upcoming.sort(byStartAsc);
  past.sort((a, b) => byStartAsc(b, a));
  return { upcoming, past, undated };
}

function isoUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** 35- or 42-cell Sunday→Saturday grid for the given year/month (0-based). */
export function buildMonthGrid(year: number, monthIndex: number): DayCell[] {
  const firstMs = Date.UTC(year, monthIndex, 1);
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const leading = new Date(firstMs).getUTCDay(); // 0 = Sunday
  const total = leading + daysInMonth;
  const weeks = Math.max(5, Math.ceil(total / 7));
  const startMs = firstMs - leading * 86_400_000;
  const cells: DayCell[] = [];
  for (let i = 0; i < weeks * 7; i += 1) {
    const d = new Date(startMs + i * 86_400_000);
    cells.push({
      iso: isoUtc(d.getTime()),
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === monthIndex && d.getUTCFullYear() === year,
    });
  }
  return cells;
}

/** Competitions whose span covers dateIso (start <= date <= end??start). */
export function competitionsOnDate(
  items: RosterCompetitionOut[],
  dateIso: string
): RosterCompetitionOut[] {
  return items.filter(
    (c) => c.start_date && c.start_date <= dateIso && effectiveEnd(c) >= dateIso
  );
}

function fmt(iso: string): { mon: string; day: number; year: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { mon: MONTHS[m - 1], day: d, year: y };
}

/** Human-readable date range, e.g. "Nov 27–29, 2026", "Nov 27, 2026", "TBD". */
export function formatCompDateRange(
  start?: string | null,
  end?: string | null
): string {
  if (!start) return "TBD";
  const s = fmt(start);
  if (!end || end === start) return `${s.mon} ${s.day}, ${s.year}`;
  const e = fmt(end);
  if (s.year !== e.year) {
    return `${s.mon} ${s.day}, ${s.year} – ${e.mon} ${e.day}, ${e.year}`;
  }
  if (s.mon !== e.mon) {
    return `${s.mon} ${s.day} – ${e.mon} ${e.day}, ${s.year}`;
  }
  return `${s.mon} ${s.day}–${e.day}, ${s.year}`;
}
