import { useMemo } from "react";
import type { SessionOut } from "@/lib/trainingApi";
import type { YtpPhaseOut } from "@/lib/ytpApi";
import { getCurrentWeekRange, summarizeWeeklyLoad } from "@/lib/trainingHelpers";

const toHours = (min: number): number => Math.round((min / 60) * 10) / 10;
const pct = (actual: number, target?: number | null): number => {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((actual / target) * 100));
};

function LoadRow({
  label,
  actualHours,
  target,
}: {
  label: string;
  actualHours: number;
  target?: number | null;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="tabular-nums text-slate-900">
          <span className="font-semibold">{actualHours.toFixed(1)} h</span>
          <span className="text-slate-400">
            {" "}
            / {target != null ? `${target} h/wk` : "—"}
          </span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-blue-500"
          style={{ width: `${pct(actualHours, target)}%` }}
        />
      </div>
    </div>
  );
}

/** "This Week vs. Planned Phase" — compares this week's actual on-ice / off-ice
 *  volume and average RPE against the active YTP phase targets. Falls back to a
 *  plain actuals view when no phase is active. */
export function WeeklyLoadBar({
  sessions,
  activePhase,
  now,
}: {
  sessions: SessionOut[];
  activePhase: YtpPhaseOut | null;
  now?: Date;
}) {
  const load = useMemo(
    () => summarizeWeeklyLoad(sessions, getCurrentWeekRange(now)),
    [sessions, now]
  );

  return (
    <section
      data-testid="weekly-load-bar"
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="mb-3 flex items-baseline justify-between">
        <h4 className="text-sm font-semibold text-slate-900">
          This Week vs. Planned Phase
        </h4>
        <span className="text-xs text-slate-500">
          {activePhase ? `Phase: ${activePhase.name}` : "No active training phase"}
        </span>
      </div>
      <div className="space-y-3">
        <LoadRow
          label="On-Ice"
          actualHours={toHours(load.onIceMinutes)}
          target={activePhase?.target_on_ice_hours_per_week}
        />
        <LoadRow
          label="Off-Ice"
          actualHours={toHours(load.offIceMinutes)}
          target={activePhase?.target_off_ice_hours_per_week}
        />
        <div className="flex items-baseline justify-between border-t border-slate-100 pt-2 text-sm">
          <span className="text-slate-600">Avg RPE ({load.sessionCount} sessions)</span>
          <span className="tabular-nums text-slate-900">
            <span className="font-semibold">{load.avgRpe || "—"}</span>
            <span className="text-slate-400">
              {" "}
              / {activePhase?.target_rpe != null ? `target ${activePhase.target_rpe}` : "—"}
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
