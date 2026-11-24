/** Structural element shape the sorter needs. JoinedEntry (entry + competition)
 *  is assignable to this, so no component-module import is required. Kept wider
 *  than CompetitionOut (optional/nullable name) so any structural caller fits. */
export interface SortableEntry {
  entry: { id: string };
  competition?: { name?: string | null; start_date?: string | null } | null;
}

/** Today as YYYY-MM-DD, matching the Upcoming badge's date basis
 *  (new Date().toISOString().slice(0, 10)). */
function defaultTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 0 = upcoming (date ≥ today), 1 = past (date < today), 2 = dateless (last). */
function groupRank(date: string, today: string): number {
  if (!date) return 2;
  return date >= today ? 0 : 1;
}

/** Stable tiebreaker for equal sort keys: competition name, then entry id. */
function tiebreak(a: SortableEntry, b: SortableEntry): number {
  const an = a.competition?.name ?? "";
  const bn = b.competition?.name ?? "";
  if (an !== bn) return an < bn ? -1 : 1;
  if (a.entry.id === b.entry.id) return 0;
  return a.entry.id < b.entry.id ? -1 : 1;
}

/** Returns a NEW array ordered upcoming-first (soonest → latest) then past
 *  (most-recent → oldest); entries with no start_date sort last. Never mutates
 *  the input. ISO YYYY-MM-DD strings are compared lexicographically (no Date
 *  parsing), avoiding timezone off-by-one bugs. */
export function sortCompetitionEntries<T extends SortableEntry>(
  entries: T[],
  todayIso: string = defaultTodayIso()
): T[] {
  return [...entries].sort((a, b) => {
    const ad = a.competition?.start_date ?? "";
    const bd = b.competition?.start_date ?? "";
    const ga = groupRank(ad, todayIso);
    const gb = groupRank(bd, todayIso);
    if (ga !== gb) return ga - gb;
    if (ga === 0 && ad !== bd) return ad < bd ? -1 : 1; // upcoming ascending
    if (ga === 1 && ad !== bd) return ad < bd ? 1 : -1; // past descending
    return tiebreak(a, b);
  });
}
