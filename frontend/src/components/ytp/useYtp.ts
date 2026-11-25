import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  createYearlyPlan,
  createYtpPhase,
  deleteYearlyPlan,
  deleteYtpPhase,
  listYearlyPlans,
  updateYearlyPlan,
  updateYtpPhase,
  type YearlyPlanCreate,
  type YearlyPlanOut,
  type YearlyPlanUpdate,
  type YtpPhaseCreate,
  type YtpPhaseUpdate,
} from "@/lib/ytpApi";

/** Owns a skater's yearly plans: loads them, tracks the active plan (newest
 *  first), exposes plan + phase mutations that keep local state in sync. */
export function useYtp(skaterId: number | string) {
  const { token } = useAuth();
  const [plans, setPlans] = useState<YearlyPlanOut[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    listYearlyPlans(skaterId, token)
      .then((rows) => {
        setPlans(rows);
        setActivePlanId((prev) =>
          prev && rows.some((p) => p.id === prev) ? prev : rows[0]?.id ?? null
        );
        setError(null);
      })
      .catch(() => setError("Failed to load season plans"))
      .finally(() => setLoading(false));
  }, [skaterId, token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createPlan = useCallback(
    async (payload: YearlyPlanCreate) => {
      const rec = await createYearlyPlan(skaterId, payload, token);
      setPlans((prev) => [rec, ...prev]);
      setActivePlanId(rec.id);
      return rec;
    },
    [skaterId, token]
  );

  const updatePlan = useCallback(
    async (planId: string, payload: YearlyPlanUpdate) => {
      const rec = await updateYearlyPlan(planId, payload, token);
      setPlans((prev) => prev.map((p) => (p.id === planId ? rec : p)));
      return rec;
    },
    [token]
  );

  const removePlan = useCallback(
    async (planId: string) => {
      await deleteYearlyPlan(planId, token);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      setActivePlanId((prev) => (prev === planId ? null : prev));
      refresh();
    },
    [token, refresh]
  );

  const addPhase = useCallback(
    async (planId: string, payload: YtpPhaseCreate) => {
      await createYtpPhase(planId, payload, token);
      refresh();
    },
    [token, refresh]
  );

  const editPhase = useCallback(
    async (phaseId: string, payload: YtpPhaseUpdate) => {
      await updateYtpPhase(phaseId, payload, token);
      refresh();
    },
    [token, refresh]
  );

  const removePhase = useCallback(
    async (phaseId: string) => {
      await deleteYtpPhase(phaseId, token);
      refresh();
    },
    [token, refresh]
  );

  return {
    plans, activePlanId, setActivePlanId, loading, error, refresh,
    createPlan, updatePlan, removePlan, addPhase, editPhase, removePhase,
  };
}
