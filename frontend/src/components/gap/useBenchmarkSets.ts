import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  applyBenchmarkSet,
  createBenchmarkSet,
  deleteBenchmarkSet,
  listBenchmarkSets,
  updateBenchmarkSet,
  type ApplySetResult,
  type BenchmarkSetCreate,
  type BenchmarkSetOut,
  type BenchmarkSetUpdate,
} from "@/lib/benchmarkSetsApi";

/** Owns the current coach's reusable benchmark sets: loads them on mount and
 *  exposes create / update / delete / apply mutations that keep local state in
 *  sync. The coach token is read from auth context, mirroring the other hooks. */
export function useBenchmarkSets() {
  const { token } = useAuth();
  const [sets, setSets] = useState<BenchmarkSetOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    listBenchmarkSets(token)
      .then((rows) => {
        setSets(rows);
        setError(null);
      })
      .catch(() => setError("Failed to load benchmark sets"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createSet = useCallback(
    async (payload: BenchmarkSetCreate) => {
      const rec = await createBenchmarkSet(payload, token);
      setSets((prev) => [rec, ...prev]);
      return rec;
    },
    [token]
  );

  const updateSet = useCallback(
    async (setId: string, payload: BenchmarkSetUpdate) => {
      const rec = await updateBenchmarkSet(setId, payload, token);
      setSets((prev) => prev.map((s) => (s.id === setId ? rec : s)));
      return rec;
    },
    [token]
  );

  const removeSet = useCallback(
    async (setId: string) => {
      await deleteBenchmarkSet(setId, token);
      setSets((prev) => prev.filter((s) => s.id !== setId));
    },
    [token]
  );

  const applySet = useCallback(
    (setId: string, skaterId: number | string): Promise<ApplySetResult> =>
      applyBenchmarkSet(setId, skaterId, token),
    [token]
  );

  return {
    sets,
    loading,
    error,
    refresh,
    createSet,
    updateSet,
    removeSet,
    applySet,
  };
}
