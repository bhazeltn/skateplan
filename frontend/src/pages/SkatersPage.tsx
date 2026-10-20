import { useEffect, useMemo, useState } from "react";
import type { DashboardAlert, Skater } from "@/lib/types";
import { getDashboard, listSkaters } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SkaterRow } from "@/components/skaters/SkaterRow";

const COLUMNS = [
  "Skater",
  "Federation & Level",
  "Periodization",
  "Planned Programs",
  "Status & Alerts",
  "Actions",
];

/** Load the roster and the dashboard alert feed together so each row can show
 *  its priority alerts without issuing a per-skater request (no N+1). */
function useRoster(token: string | null) {
  const [skaters, setSkaters] = useState<Skater[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  useEffect(() => {
    let active = true;
    Promise.all([listSkaters(token), getDashboard(token)])
      .then(([rows, dash]) => {
        if (!active) return;
        setSkaters(rows);
        setAlerts(dash.alerts);
      })
      .catch(() => active && setSkaters([]));
    return () => {
      active = false;
    };
  }, [token]);
  return { skaters, alerts };
}

function matches(skater: Skater, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    skater.first_name,
    skater.last_name,
    skater.home_club,
    skater.federation_name,
    skater.competitive_level ?? skater.level_name,
  ];
  return haystack.some((v) => (v ?? "").toLowerCase().includes(q));
}

function RosterTable({
  skaters,
  alerts,
}: {
  skaters: Skater[];
  alerts: DashboardAlert[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COLUMNS.map((c) => (
              <th key={c} className="px-3 py-2">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {skaters.map((s) => (
            <SkaterRow
              key={s.skater_id}
              skater={s}
              alerts={alerts.filter((a) => a.skater_id === s.skater_id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkatersPage() {
  const { token } = useAuth();
  const { skaters, alerts } = useRoster(token);
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () => skaters.filter((s) => matches(s, query)),
    [skaters, query]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Skaters</h1>
        <p className="text-sm text-slate-500">
          Roster overview — programs, load restrictions and priority alerts.
        </p>
      </div>

      <Input
        type="search"
        aria-label="Search skaters"
        placeholder="Search skaters by name, club, federation or level…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-md"
      />

      <Card className="p-0">
        {visible.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            No skaters match your search.
          </p>
        ) : (
          <RosterTable skaters={visible} alerts={alerts} />
        )}
      </Card>
    </div>
  );
}
