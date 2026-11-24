import type { SegmentResultOut } from "@/lib/types";

/** Structural input: the JoinedEntry shape from useSkaterEntries is assignable
 *  to this, avoiding a lib → component import. */
export interface BestsEntryInput {
  entry: { id: string };
  competition?: { name?: string | null; start_date?: string | null } | null;
  results: SegmentResultOut[];
}

export type BestMark = {
  value: number;
  entryId: string;
  resultId?: string;
  competitionName: string;
  date: string;
};

export type FieldBest = { pb: BestMark | null; sb: BestMark | null };
export type SegmentBests = { tss: FieldBest; tes: FieldBest; pcs: FieldBest };
export type SkaterBests = {
  season: string;
  total: FieldBest;
  sp: SegmentBests;
  fs: SegmentBests;
};

type MarkBase = {
  entryId: string;
  resultId?: string;
  competitionName: string;
  date: string;
};

/** Canonical skating season (Jul 1 – Jun 30), labelled "YYYY-YY". */
export function getSkatingSeason(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth(); // 0-based; July = 6
  const startYear = month >= 6 ? year : year - 1;
  const endYY = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYY}`;
}

/** The season label for "now" (defaults to the current date). */
export function getCurrentSkatingSeason(now: Date = new Date()): string {
  return getSkatingSeason(now.toISOString().slice(0, 10));
}

const emptyField = (): FieldBest => ({ pb: null, sb: null });
const emptySegment = (): SegmentBests => ({
  tss: emptyField(),
  tes: emptyField(),
  pcs: emptyField(),
});

/** Defensive numeric parse: null/undefined/NaN → null. */
function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/** Update a field's PB (career) and SB (in-season) with a candidate value. */
function consider(
  field: FieldBest,
  value: number | null,
  base: MarkBase,
  inSeason: boolean
): void {
  if (value === null) return;
  const mark: BestMark = { value, ...base };
  if (!field.pb || value > field.pb.value) field.pb = mark;
  if (inSeason && (!field.sb || value > field.sb.value)) field.sb = mark;
}

function applySegment(
  seg: SegmentBests,
  r: SegmentResultOut,
  base: MarkBase,
  inSeason: boolean
): void {
  const b: MarkBase = { ...base, resultId: r.id };
  consider(seg.tss, num(r.tss), b, inSeason);
  consider(seg.tes, num(r.tes), b, inSeason);
  consider(seg.pcs, num(r.pcs), b, inSeason);
}

function applyCombinedTotal(
  total: FieldBest,
  results: SegmentResultOut[],
  base: MarkBase,
  inSeason: boolean
): void {
  const sp = results.find((r) => r.segment === "SP" && num(r.tss) !== null);
  const fs = results.find((r) => r.segment === "FS" && num(r.tss) !== null);
  if (!sp || !fs) return;
  const combined = (num(sp.tss) as number) + (num(fs.tss) as number);
  consider(total, combined, base, inSeason);
}

/** Career PBs and season-scoped SBs for a skater's competition history. */
export function computeSkaterBests(
  entries: BestsEntryInput[],
  season: string = getCurrentSkatingSeason()
): SkaterBests {
  const bests: SkaterBests = {
    season,
    total: emptyField(),
    sp: emptySegment(),
    fs: emptySegment(),
  };
  for (const item of entries ?? []) {
    const date = item.competition?.start_date ?? "";
    const base: MarkBase = {
      entryId: item.entry.id,
      competitionName: item.competition?.name ?? "",
      date,
    };
    const inSeason = date ? getSkatingSeason(date) === season : false;
    const results = item.results ?? [];
    for (const r of results) {
      if (r.segment === "SP") applySegment(bests.sp, r, base, inSeason);
      else if (r.segment === "FS") applySegment(bests.fs, r, base, inSeason);
    }
    applyCombinedTotal(bests.total, results, base, inSeason);
  }
  return bests;
}

/** "PB" if the entry holds the PB, else "SB" if it holds the SB, else null.
 *  A PB set in-season therefore shows only PB (never both). */
export function getBadgeKind(
  entryId: string,
  pbMark: BestMark | null,
  sbMark: BestMark | null
): "PB" | "SB" | null {
  if (pbMark && pbMark.entryId === entryId) return "PB";
  if (sbMark && sbMark.entryId === entryId) return "SB";
  return null;
}
