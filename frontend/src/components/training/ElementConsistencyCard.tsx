import type { ElementStatOut } from "@/lib/trainingApi";
import { TwoTierConsistencyBar } from "./TwoTierConsistencyBar";

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

/** Per-element two-tier consistency from training metrics: a stacked clean /
 *  completed-with-calls bar plus the top technical calls. Clean empty state until
 *  at least one attempt has been logged. */
export function ElementConsistencyCard({ stats }: { stats: ElementStatOut[] }) {
  return (
    <section
      data-testid="element-consistency"
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-sm font-semibold text-slate-900">Element Consistency</h4>
        <span className="text-xs text-slate-500">Clean vs completed</span>
      </div>
      <div className="mb-2">
        <Legend />
      </div>
      {stats.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
          No attempts logged yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {stats.map((s) => (
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
      )}
    </section>
  );
}
