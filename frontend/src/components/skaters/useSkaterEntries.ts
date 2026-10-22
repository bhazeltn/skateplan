import { useCallback, useEffect, useState } from "react";
import {
  createEntry,
  createSegmentResult,
  getEntryProtocol,
  listSkaterEntries,
  searchCompetitions,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type {
  CompetitionOut,
  EntryOut,
  EntryPayload,
  ResultPayload,
  SegmentResultOut,
} from "@/lib/types";

export interface JoinedEntry {
  entry: EntryOut;
  competition?: CompetitionOut;
  results: SegmentResultOut[];
}

async function joinEntries(
  entries: EntryOut[],
  comps: CompetitionOut[],
  token?: string | null
): Promise<JoinedEntry[]> {
  const byId = new Map(comps.map((c) => [c.id, c]));
  return Promise.all(
    entries.map(async (entry) => ({
      entry,
      competition: byId.get(entry.competition_id),
      results: await getEntryProtocol(entry.id, token)
        .then((p) => p.segments)
        .catch(() => [] as SegmentResultOut[]),
    }))
  );
}

/** Loads a skater's competition entries joined with their competition and
 *  recorded segment results; exposes create + log-result mutations. */
export function useSkaterEntries(skaterId: number) {
  const { token } = useAuth();
  const [items, setItems] = useState<JoinedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [entries, comps] = await Promise.all([
        listSkaterEntries(skaterId, token),
        searchCompetitions("", token),
      ]);
      setItems(await joinEntries(entries, comps, token));
    } finally {
      setLoading(false);
    }
  }, [skaterId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const addEntry = useCallback(
    async (payload: EntryPayload) => {
      await createEntry(skaterId, payload, token);
      await load();
    },
    [skaterId, token, load]
  );

  const logResult = useCallback(
    async (entryId: string, payload: ResultPayload) => {
      await createSegmentResult(entryId, payload, token);
      await load();
    },
    [token, load]
  );

  return { items, loading, addEntry, logResult };
}
