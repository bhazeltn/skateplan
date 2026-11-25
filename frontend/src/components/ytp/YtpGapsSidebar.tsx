import { useState } from "react";
import type { SkaterBenchmark } from "@/lib/types";
import type { YtpPhaseOut } from "@/lib/ytpApi";
import { buildGapCoverage } from "@/lib/ytpTimeline";

interface Props {
  benchmarks: SkaterBenchmark[];
  phases: YtpPhaseOut[];
}

/** Coverage pill: green "Targeted" when phases address the gap, amber otherwise. */
function CoveragePill({ phaseNames }: { phaseNames: string[] }) {
  if (phaseNames.length === 0) {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        Unassigned
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
      Targeted: {phaseNames.join(", ")}
    </span>
  );
}

function groupByCategory(items: SkaterBenchmark[]): Record<string, SkaterBenchmark[]> {
  const out: Record<string, SkaterBenchmark[]> = {};
  for (const b of items) {
    (out[b.category] ??= []).push(b);
  }
  return out;
}

/** Sidebar that cross-references open (non-MET) benchmarks against plan phases,
 *  showing which gaps are targeted and which remain unassigned, grouped by
 *  category. Sticky on desktop, collapsible on mobile. */
export function YtpGapsSidebar({ benchmarks, phases }: Props) {
  const [open, setOpen] = useState(false);
  const { coverage, targetedCount, openCount } = buildGapCoverage(benchmarks, phases);
  const openBenchmarks = benchmarks.filter((b) => b.status !== "MET");
  const groups = groupByCategory(openBenchmarks);

  return (
    <aside className="lg:sticky lg:top-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between text-left lg:cursor-default"
        >
          <span className="text-sm font-semibold text-slate-900">Gap Coverage</span>
          <span className="text-xs font-medium text-slate-500">
            {targetedCount} / {openCount} open gaps targeted
          </span>
        </button>

        <div className={`${open ? "block" : "hidden"} mt-3 space-y-4 lg:block`}>
          {openCount === 0 ? (
            <p className="text-xs text-slate-400">
              No open gaps — every benchmark is met. 🎉
            </p>
          ) : (
            Object.entries(groups).map(([category, items]) => (
              <div key={category}>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  {category}
                </p>
                <ul className="mt-1 space-y-2">
                  {items.map((b) => (
                    <li key={b.id} className="space-y-1">
                      <p className="text-sm text-slate-700">{b.name}</p>
                      <CoveragePill phaseNames={coverage[b.id] ?? []} />
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
