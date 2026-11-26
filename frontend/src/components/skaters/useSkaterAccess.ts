import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getSkaterAccess,
  inviteToSkater,
  removeCoachAccess,
  revokeInvite,
  updateCoachRole,
  type InviteCreate,
  type InviteResponse,
  type SkaterAccessSummaryOut,
} from "@/lib/accessApi";

const EMPTY: SkaterAccessSummaryOut = { coaches: [], pending_invites: [] };

/** Owns the access summary for one skater plus invite/coach mutations. */
export function useSkaterAccess(skaterId: number | string) {
  const { token } = useAuth();
  const [summary, setSummary] = useState<SkaterAccessSummaryOut>(EMPTY);
  const [loading, setLoading] = useState(true);

  // Silent refetch: never toggles `loading`, so mutation-driven refreshes do
  // not blank the tab (which would discard the just-created invite link).
  const refresh = useCallback(() => {
    return getSkaterAccess(skaterId, token)
      .then(setSummary)
      .catch(() => setSummary(EMPTY));
  }, [skaterId, token]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const invite = useCallback(
    async (payload: InviteCreate): Promise<InviteResponse> => {
      const res = await inviteToSkater(skaterId, payload, token);
      refresh();
      return res;
    },
    [skaterId, token, refresh]
  );

  const setRole = useCallback(
    async (coachUserId: number, role: string) => {
      await updateCoachRole(skaterId, coachUserId, { role }, token);
      refresh();
    },
    [skaterId, token, refresh]
  );

  const remove = useCallback(
    async (coachUserId: number) => {
      await removeCoachAccess(skaterId, coachUserId, token);
      refresh();
    },
    [skaterId, token, refresh]
  );

  const revoke = useCallback(
    async (inviteId: string) => {
      await revokeInvite(skaterId, inviteId, token);
      refresh();
    },
    [skaterId, token, refresh]
  );

  return { summary, loading, refresh, invite, setRole, remove, revoke };
}
