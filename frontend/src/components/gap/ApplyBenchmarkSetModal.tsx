import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useBenchmarkSets } from "@/components/gap/useBenchmarkSets";
import type { ApplySetResult, BenchmarkSetOut } from "@/lib/benchmarkSetsApi";

interface Props {
  skaterId: number | string;
  onClose: () => void;
  onApplied: (result: ApplySetResult) => void;
  onManage: () => void;
}

/** One selectable benchmark set with its item count and an Apply action. */
function SetRow({
  set,
  busy,
  onApply,
}: {
  set: BenchmarkSetOut;
  busy: boolean;
  onApply: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{set.name}</p>
        {set.description ? (
          <p className="truncate text-xs text-slate-500">{set.description}</p>
        ) : null}
        <p className="text-xs text-slate-400">
          {set.items.length} benchmark{set.items.length === 1 ? "" : "s"}
        </p>
      </div>
      <Button type="button" size="sm" disabled={busy} onClick={onApply}>
        Apply
      </Button>
    </li>
  );
}

/** Coach picks one of their reusable sets to copy onto this skater; applying
 *  reports created / skipped counts back to the parent for the success banner. */
export function ApplyBenchmarkSetModal({
  skaterId,
  onClose,
  onApplied,
  onManage,
}: Props) {
  const { sets, loading, applySet } = useBenchmarkSets();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async (setId: string) => {
    setBusyId(setId);
    setError(null);
    try {
      const result = await applySet(setId, skaterId);
      onApplied(result);
      onClose();
    } catch {
      setError("Could not apply this set. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-set-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="apply-set-title" className="text-base font-semibold text-slate-900">
          Apply a Benchmark Set
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Copies the set's items onto this skater as new targets. Existing
          duplicates are skipped automatically.
        </p>

        {error ? (
          <Alert variant="danger" className="mt-4">
            {error}
          </Alert>
        ) : null}

        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-400">Loading sets…</p>
          ) : sets.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 p-4 text-center">
              <p className="text-sm text-slate-500">
                You haven't created any benchmark sets yet.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={onManage}
              >
                + Create a set
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {sets.map((set) => (
                <SetRow
                  key={set.id}
                  set={set}
                  busy={busyId === set.id}
                  onApply={() => handleApply(set.id)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onManage}>
            Manage Sets
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
