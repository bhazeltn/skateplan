import type { SegmentResultOut } from "@/lib/types";

/** Ordinal suffix for a rank, handling the 11/12/13 (and 111/112/113) rule. */
export function ordinal(rank: number): string {
  const mod100 = Math.abs(rank) % 100;
  const mod10 = mod100 % 10;
  let suffix = "th";
  if (mod100 < 11 || mod100 > 13) {
    if (mod10 === 1) suffix = "st";
    else if (mod10 === 2) suffix = "nd";
    else if (mod10 === 3) suffix = "rd";
  }
  return `${rank}${suffix}`;
}

/** Left-border accent for podium placements (gold/silver/bronze), else "". */
export function getPodiumAccentClass(rank: number | null): string {
  if (rank === 1) return "border-l-4 border-l-amber-400";
  if (rank === 2) return "border-l-4 border-l-slate-400";
  if (rank === 3) return "border-l-4 border-l-orange-400";
  return "";
}

export interface EntrySummary {
  totalScore: number | null;
  overallRank: number | null;
}

/** Pure helper: combined TSS across segments and the entry's overall rank. */
export function computeEntrySummary(results: SegmentResultOut[]): EntrySummary {
  if (!results || results.length === 0) {
    return { totalScore: null, overallRank: null };
  }
  const totalScore = results.reduce((sum, r) => sum + (r.tss ?? 0), 0);
  const fs = results.find((r) => r.segment === "FS" && r.overall_rank != null);
  const anyRank = results.find((r) => r.overall_rank != null);
  const overallRank = fs?.overall_rank ?? anyRank?.overall_rank ?? null;
  return { totalScore, overallRank };
}

const BADGE_BASE =
  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-sm";

function badgeStyle(rank: number): { cls: string; label: string } {
  if (rank === 1) {
    return {
      cls: "bg-amber-100 text-amber-900 border border-amber-300 font-semibold",
      label: "🥇 1st",
    };
  }
  if (rank === 2) {
    return {
      cls: "bg-slate-200 text-slate-800 border border-slate-300 font-semibold",
      label: "🥈 2nd",
    };
  }
  if (rank === 3) {
    return {
      cls: "bg-orange-100 text-orange-900 border border-orange-300 font-semibold",
      label: "🥉 3rd",
    };
  }
  return {
    cls: "bg-slate-100 text-slate-700 border border-slate-200 font-medium",
    label: ordinal(rank),
  };
}

/** Prominent placement pill; renders nothing when rank is null. */
export default function EntryResultBadge({ rank }: { rank: number | null }) {
  if (rank == null) return null;
  const { cls, label } = badgeStyle(rank);
  return (
    <span data-testid="entry-result-badge" className={`${BADGE_BASE} ${cls}`}>
      {label}
    </span>
  );
}
