import { Badge } from "@/components/ui/badge";
import type {
  ProgramConsistencyOut,
  ProgramElementStatOut,
} from "@/lib/runThroughsApi";

function accent(pct: number): string {
  if (pct >= 75) return "text-emerald-700";
  if (pct >= 40) return "text-amber-700";
  return "text-rose-700";
}

function barColor(pct: number): string {
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

function ElementStatRow({ stat }: { stat: ProgramElementStatOut }) {
  const pct = stat.clean_percentage;
  return (
    <li className="flex items-center gap-3 py-1.5">
      <span className="w-16 shrink-0 font-mono text-xs font-semibold text-slate-900">
        {stat.element_code}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${barColor(pct)}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-12 shrink-0 text-right text-xs font-semibold ${accent(pct)}`}>
        {pct}%
      </span>
      <span className="w-16 shrink-0 text-right text-[11px] text-slate-500 tabular-nums">
        {stat.clean_count}/{stat.total_attempts}
      </span>
    </li>
  );
}

function ProgramBlock({ entry }: { entry: ProgramConsistencyOut }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-900">
          {entry.program_name}
        </span>
        <Badge variant="primary">{entry.segment}</Badge>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
        <span>
          {entry.total_runs} runs · {entry.full_runs} full · {entry.clean_runs} clean
        </span>
        <span className={`font-semibold ${accent(entry.overall_clean_percentage)}`}>
          {entry.overall_clean_percentage}% elements clean
        </span>
      </div>
      {entry.element_stats.length > 0 ? (
        <ul className="divide-y divide-slate-100">
          {entry.element_stats.map((s) => (
            <ElementStatRow key={s.element_code} stat={s} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Program run-through consistency: per program, run counts and per-element clean
 *  rates derived from logged run-throughs. Empty hint until the first run-through. */
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
