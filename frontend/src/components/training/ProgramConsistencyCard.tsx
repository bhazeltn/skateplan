import { Badge } from "@/components/ui/badge";
import type { ProgramConsistencyOut } from "@/lib/runThroughsApi";
import { TwoTierConsistencyBar } from "./TwoTierConsistencyBar";

function accent(pct: number): string {
  if (pct >= 75) return "text-emerald-700";
  if (pct >= 40) return "text-amber-700";
  return "text-rose-700";
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Clean
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-amber-400" /> Completed w/ calls
      </span>
    </div>
  );
}

function ProgramBlock({ entry }: { entry: ProgramConsistencyOut }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-900">{entry.program_name}</span>
        <Badge variant="primary">{entry.segment}</Badge>
      </div>
      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
        <span>
          {entry.total_runs} runs · {entry.full_runs} full · {entry.clean_runs} clean
        </span>
        <span className="font-semibold text-slate-800">
          {entry.overall_completed_percentage}% completed
        </span>
        <span className={`font-semibold ${accent(entry.overall_clean_percentage)}`}>
          {entry.overall_clean_percentage}% clean
        </span>
      </div>
      <div className="mb-2">
        <Legend />
      </div>
      {entry.element_stats.length > 0 ? (
        <ul className="divide-y divide-slate-100">
          {entry.element_stats.map((s) => (
            <TwoTierConsistencyBar
              key={s.element_code}
              elementCode={s.element_code}
              totalAttempts={s.total_attempts}
              withCallsCount={s.with_calls_count}
              cleanPercentage={s.clean_percentage}
              completedPercentage={s.completed_percentage}
              tagCounts={s.tag_counts}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Program run-through consistency: per program, run counts and per-element
 *  two-tier (clean vs completed-with-calls) rates. Empty hint until the first run. */
export function ProgramConsistencyCard({
  stats,
}: {
  stats: ProgramConsistencyOut[];
}) {
  return (
    <section
      data-testid="program-consistency"
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-sm font-semibold text-slate-900">Program Consistency</h4>
        <span className="text-xs text-slate-500">Run-throughs</span>
      </div>
      {stats.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
          Log a program run-through on a session to track program consistency.
        </p>
      ) : (
        <div className="space-y-3">
          {stats.map((e) => (
            <ProgramBlock key={e.program_id} entry={e} />
          ))}
        </div>
      )}
    </section>
  );
}
