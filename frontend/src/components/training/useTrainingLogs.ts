import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  createSession,
  deleteSession,
  deleteSessionAttempt,
  getTrainingMetrics,
  listSkaterSessions,
  logSessionAttempts,
  updateSession,
  updateSessionAttempt,
  type AttemptIn,
  type AttemptUpdate,
  type MetricsOut,
  type SessionCreate,
  type SessionOut,
  type SessionUpdate,
} from "@/lib/trainingApi";

const EMPTY_METRICS: MetricsOut = {
  skater_id: 0,
  total_ice_minutes: 0,
  session_count: 0,
  workload_index: 0,
  average_rpe: 0,
  element_stats: [],
};

/** Owns a skater's training logs: loads sessions + aggregate metrics and exposes
 *  session/attempt CRUD that refresh derived state. Keyed strictly by skaterId. */
export function useTrainingLogs(skaterId: number | string) {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<SessionOut[]>([]);
  const [metrics, setMetrics] = useState<MetricsOut>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    return Promise.all([
      listSkaterSessions(skaterId, token),
      getTrainingMetrics(skaterId, token),
    ])
      .then(([rows, m]) => {
        setSessions(rows);
        setMetrics(m);
        setError(null);
      })
      .catch(() => setError("Failed to load training logs"))
      .finally(() => setLoading(false));
  }, [skaterId, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addSession = useCallback(
    async (payload: SessionCreate) => {
      await createSession(payload, token);
      await refresh();
    },
    [token, refresh]
  );

  const editSession = useCallback(
    async (sessionId: string, payload: SessionUpdate) => {
      await updateSession(sessionId, payload, token);
      await refresh();
    },
    [token, refresh]
  );

  const removeSession = useCallback(
    async (sessionId: string) => {
      await deleteSession(sessionId, token);
      await refresh();
    },
    [token, refresh]
  );

  const addAttempts = useCallback(
    async (sessionId: string, payload: AttemptIn | AttemptIn[]) => {
      await logSessionAttempts(sessionId, payload, token);
      await refresh();
    },
    [token, refresh]
  );

  const editAttempt = useCallback(
    async (sessionId: string, attemptId: string, payload: AttemptUpdate) => {
      await updateSessionAttempt(sessionId, attemptId, payload, token);
      await refresh();
    },
    [token, refresh]
  );

  const removeAttempt = useCallback(
    async (sessionId: string, attemptId: string) => {
      await deleteSessionAttempt(sessionId, attemptId, token);
      await refresh();
    },
    [token, refresh]
  );

  return {
    sessions, metrics, loading, error, refresh,
    addSession, editSession, removeSession,
    addAttempts, editAttempt, removeAttempt,
  };
}
