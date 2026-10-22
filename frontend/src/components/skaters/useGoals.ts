import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  createSkaterBenchmark,
  listSkaterBenchmarks,
  updateSkaterBenchmark,
} from "@/lib/api";
import type { SkaterBenchmark, SkaterBenchmarkPayload } from "@/lib/types";

/** Standalone goals data hook: fetch + create + status update via the
 *  coach-driven benchmarks API, decoupled from the gap-analysis workflow. */
export function useGoals(skaterId: number | string) {
  const { token } = useAuth();
  const [goals, setGoals] = useState<SkaterBenchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    listSkaterBenchmarks(skaterId, token)
      .then(setGoals)
      .catch(() => setGoals([]))
      .finally(() => setLoading(false));
  }, [skaterId, token]);

  useEffect(() => load(), [load]);

  async function create(payload: SkaterBenchmarkPayload) {
    setSaving(true);
    try {
      await createSkaterBenchmark(skaterId, payload, token);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function update(id: string, payload: Partial<SkaterBenchmarkPayload>) {
    setSaving(true);
    try {
      await updateSkaterBenchmark(skaterId, id, payload, token);
      load();
    } finally {
      setSaving(false);
    }
  }

  return { goals, loading, saving, create, update };
}
