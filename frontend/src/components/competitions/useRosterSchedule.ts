import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getRosterCompetitionSchedule,
  updateCompetition,
  type CompetitionUpdate,
  type RosterCompetitionOut,
} from "@/lib/competitionScheduleApi";

function deriveLocation(city?: string | null, country?: string | null): string | null {
  return [city, country].filter(Boolean).join(", ") || null;
}

/** Merge persisted edit fields into an existing competition, keeping its entries. */
function applyEdit(
  comp: RosterCompetitionOut,
  updated: RosterCompetitionOut
): RosterCompetitionOut {
  return {
    ...comp,
    name: updated.name,
    start_date: updated.start_date ?? null,
    end_date: updated.end_date ?? null,
    city: updated.city ?? null,
    country: updated.country ?? null,
    location: deriveLocation(updated.city, updated.country),
  };
}

export interface SkaterOption {
  id: number;
  name: string;
}

/** Deduplicated skater options across all competition entries, sorted by name. */
function deriveSkaterOptions(items: RosterCompetitionOut[]): SkaterOption[] {
  const byId = new Map<number, string>();
  for (const comp of items) {
    for (const e of comp.entries) byId.set(e.skater_id, e.skater_name);
  }
  return [...byId.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Narrow to competitions with an entry for skaterId; trim entries to them. */
function filterBySkater(
  items: RosterCompetitionOut[],
  skaterId: number | null
): RosterCompetitionOut[] {
  if (skaterId == null) return items;
  return items
    .map((c) => ({ ...c, entries: c.entries.filter((e) => e.skater_id === skaterId) }))
    .filter((c) => c.entries.length > 0);
}

/** Loads the consolidated roster schedule and exposes skater-filter state. */
export function useRosterSchedule() {
  const { token } = useAuth();
  const [competitions, setCompetitions] = useState<RosterCompetitionOut[]>([]);
  const [selectedSkaterId, setSelectedSkaterId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getRosterCompetitionSchedule(token)
      .then((rows) => {
        if (!active) return;
        setCompetitions(rows);
        setError(null);
      })
      .catch(() => active && setError("Failed to load competition schedule"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  const skaterOptions = useMemo(
    () => deriveSkaterOptions(competitions),
    [competitions]
  );
  const filteredCompetitions = useMemo(
    () => filterBySkater(competitions, selectedSkaterId),
    [competitions, selectedSkaterId]
  );

  const editCompetition = useCallback(
    async (competitionId: string, payload: CompetitionUpdate) => {
      const updated = await updateCompetition(competitionId, payload, token);
      setCompetitions((prev) =>
        prev.map((c) => (c.id === competitionId ? applyEdit(c, updated) : c))
      );
    },
    [token]
  );

  return {
    competitions,
    skaterOptions,
    selectedSkaterId,
    setSelectedSkaterId,
    filteredCompetitions,
    editCompetition,
    loading,
    error,
  };
}
