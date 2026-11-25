import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getSkater } from "@/lib/api";
import type { SkaterProgram } from "@/lib/types";
import {
  getProgramStats,
  type ProgramConsistencyOut,
} from "@/lib/runThroughsApi";

/** Owns a skater's program run-through consistency: the derived program-stats and
 *  the active (non-archived) programs used to log run-throughs. Keyed by skaterId. */
export function useProgramStats(skaterId: number | string) {
  const { token } = useAuth();
  const [programStats, setProgramStats] = useState<ProgramConsistencyOut[]>([]);
  const [programs, setPrograms] = useState<SkaterProgram[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshProgramStats = useCallback(() => {
    setLoading(true);
    return Promise.all([
      getProgramStats(skaterId, token),
      getSkater(skaterId, token),
    ])
      .then(([stats, detail]) => {
        setProgramStats(stats);
        setPrograms(detail.programs.filter((p) => !p.is_archived));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [skaterId, token]);

  useEffect(() => {
    void refreshProgramStats();
  }, [refreshProgramStats]);

  return { programStats, programs, loading, refreshProgramStats };
}
