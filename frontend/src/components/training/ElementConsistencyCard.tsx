import type { ElementStatOut } from "@/lib/trainingApi";

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

function StatRow({ stat }: { stat: ElementStatOut }) {
  const pct = stat.clean_percentage;
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="w-16 shrink-0 font-mono text-sm font-semibold text-slate-900">
        {stat.element_code}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${barColor(pct)}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-12 shrink-0 text-right text-sm font-semibold ${accent(pct)}`}>
        {pct}%
      </span>
      <span className="w-20 shrink-0 text-right text-xs text-slate-500 tabular-nums">
        {stat.clean_count}/{stat.total_attempts}
      </span>
    </li>
  );
}

/** Per-element clean-landing consistency from training metrics. Clean empty
 *  state until at least one attempt has been logged. */
export function ElementConsistencyCard({ stats }: { stats: ElementStatOut[] }) {
  return (
    <section
      data-testid="element-consistency"
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-sm font-semibold text-slate-900">Element Consistency</h4>
        <span className="text-xs text-slate-500">Clean landings</span>
      </div>
      {stats.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
          No attempts logged yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {stats.map((s) => (
            <StatRow key={s.element_code} stat={s} />
          ))}
        </ul>
      )}
    </section>
  );
}
