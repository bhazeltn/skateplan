import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getMySkaterAccess, type SkaterCapabilities } from "@/lib/accessApi";

// While loading (or on error) default to a safe read-only, no-manage state so
// edit/delete/manage controls stay hidden until capabilities resolve.
const READ_ONLY: SkaterCapabilities = {
  role: null,
  can_edit_plan: false,
  can_edit_goals: false,
  can_log_training: false,
  can_manage_access: false,
};

/** Resolve the current user's capabilities for one skater. */
export function useSkaterCapabilities(skaterId: number | string | undefined) {
  const { token } = useAuth();
  const [capabilities, setCapabilities] = useState<SkaterCapabilities>(READ_ONLY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (skaterId === undefined) return;
    let active = true;
    setLoading(true);
    getMySkaterAccess(skaterId, token)
      .then((caps) => active && setCapabilities(caps))
      .catch(() => active && setCapabilities(READ_ONLY))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [skaterId, token]);

  return { role: capabilities.role, capabilities, loading };
}
