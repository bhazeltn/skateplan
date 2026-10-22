import { useState } from "react";
import { AddEntryModal } from "@/components/skaters/AddEntryModal";
import { CompetitionEntryRow } from "@/components/skaters/CompetitionEntryRow";
import { LogResultModal } from "@/components/skaters/LogResultModal";
import { useSkaterEntries } from "@/components/skaters/useSkaterEntries";
import type { SkaterProgram } from "@/lib/types";

interface Props {
  skaterId: number;
  programs: SkaterProgram[];
}

/** Skater profile → Competitions tab: lists entries, registers new ones, and
 *  records deterministic segment results (TSS = TES + PCS + Bonus − Deductions). */
export function CompetitionsTab({ skaterId, programs }: Props) {
  const { items, loading, addEntry, logResult } = useSkaterEntries(skaterId);
  const [adding, setAdding] = useState(false);
  const [logFor, setLogFor] = useState<string | null>(null);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Competitions</h3>
          <p className="text-xs text-slate-500">
            Entries, assigned programs, and recorded segment scores.
          </p>
        </div>
        <button type="button" onClick={() => setAdding(true)}
          className="shrink-0 rounded-md bg-slate-900 px-3 py-2 text-sm
            font-semibold text-white hover:bg-slate-800">
          + Add Entry
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading competitions…</p>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 p-6
          text-center text-sm text-slate-400">
          No competition entries yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <CompetitionEntryRow key={item.entry.id} item={item}
              programs={programs} onLogResults={setLogFor} />
          ))}
        </ul>
      )}

      <AddEntryModal open={adding} skaterId={skaterId} programs={programs}
        onClose={() => setAdding(false)} onSubmit={addEntry} />
      <LogResultModal open={logFor !== null} entryId={logFor ?? ""}
        onClose={() => setLogFor(null)} onSubmit={logResult} />
    </section>
  );
}
