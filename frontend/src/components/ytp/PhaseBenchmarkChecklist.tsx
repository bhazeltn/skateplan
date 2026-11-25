import type { SkaterBenchmark } from "@/lib/types";

interface Props {
  benchmarks: SkaterBenchmark[];
  selected: string[];
  onToggle: (id: string) => void;
}

function groupByCategory(items: SkaterBenchmark[]): Record<string, SkaterBenchmark[]> {
  const out: Record<string, SkaterBenchmark[]> = {};
  for (const b of items) {
    (out[b.category] ??= []).push(b);
  }
  return out;
}

/** Grouped, checkable list of the skater's benchmarks for linking to a phase. */
export function PhaseBenchmarkChecklist({ benchmarks, selected, onToggle }: Props) {
  if (benchmarks.length === 0) {
    return (
      <p className="text-xs text-slate-400">
        This skater has no benchmarks yet. Add some in the Gap Analysis tab first.
      </p>
    );
  }
  const groups = groupByCategory(benchmarks);
  return (
    <div className="max-h-48 space-y-3 overflow-y-auto rounded-md border border-slate-200 p-3">
      {Object.entries(groups).map(([category, items]) => (
        <div key={category}>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">{category}</p>
          <ul className="mt-1 space-y-1">
            {items.map((b) => (
              <li key={b.id}>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={selected.includes(b.id)}
                    onChange={() => onToggle(b.id)}
                  />
                  {b.name}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
