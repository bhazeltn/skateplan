import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CustomBenchmarksPanel } from "@/components/gap/CustomBenchmarksPanel";
import { listSkaters } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { Skater } from "@/lib/types";

/** Clickable roster: selecting an athlete opens their custom benchmark matrix. */
function RosterList({
  skaters,
  activeId,
  onSelect,
}: {
  skaters: Skater[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {skaters.map((s) => {
        const id = String(s.skater_id);
        const active = id === activeId;
        return (
          <button
            key={s.skater_id}
            type="button"
            onClick={() => onSelect(id)}
            className={`rounded-md border px-3 py-2 text-sm font-medium
              transition-colors ${
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
          >
            {s.first_name} {s.last_name}
          </button>
        );
      })}
    </div>
  );
}

/** Coach-driven benchmark management: pick an athlete from the roster and manage
 *  their coach-defined custom benchmark targets and development-gap tracking.
 *  Supports a ?skater= deep link from the profile Gap Analysis tab. The retired
 *  four-pillar competitive standard assessment has been removed. */
export function GapAnalysisPage() {
  const { token } = useAuth();
  const [params] = useSearchParams();
  const [skaters, setSkaters] = useState<Skater[]>([]);
  const [skaterId, setSkaterId] = useState(params.get("skater") ?? "");

  useEffect(() => {
    listSkaters(token)
      .then(setSkaters)
      .catch(() => setSkaters([]));
  }, [token]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Competitive Development &amp; Benchmark Assessment
        </h1>
        <p className="text-sm text-slate-500">
          Select an athlete to manage their coach-defined custom benchmark
          targets and track development gaps.
        </p>
      </div>

      <div>
        <p className="mb-2 block text-sm font-medium text-slate-700">Skater</p>
        <RosterList
          skaters={skaters}
          activeId={skaterId}
          onSelect={setSkaterId}
        />
      </div>

      {skaterId ? (
        <CustomBenchmarksPanel skaterId={skaterId} />
      ) : (
        <p className="text-sm text-slate-400">
          Select an athlete to manage their benchmark targets.
        </p>
      )}
    </div>
  );
}
