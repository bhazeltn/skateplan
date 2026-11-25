import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import {
  BENCHMARK_CATEGORIES,
  BENCHMARK_STATUSES,
} from "@/components/gap/gapScoring";
import type {
  BenchmarkStatus,
  SkaterBenchmark,
  SkaterBenchmarkPayload,
} from "@/lib/types";

interface Props {
  benchmark: SkaterBenchmark;
  onSave: (id: string, payload: Partial<SkaterBenchmarkPayload>) => Promise<void>;
  onClose: () => void;
}

const FIELD =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm " +
  "text-slate-900 focus:border-slate-500 focus:outline-none";

/** Coaches edit an existing benchmark's category, name, status and notes.
 *  Pre-populated from the row; submit PATCHes only the editable fields. */
export function EditBenchmarkModal({ benchmark, onSave, onClose }: Props) {
  const [category, setCategory] = useState(benchmark.category);
  const [name, setName] = useState(benchmark.name);
  const [status, setStatus] = useState<BenchmarkStatus>(benchmark.status);
  const [notes, setNotes] = useState(benchmark.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(benchmark.id, {
        category,
        name: name.trim(),
        status,
        notes: notes.trim() || null,
      });
      onClose();
    } catch {
      setError("Could not save changes. Please try again.");
      setSaving(false);
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
        aria-labelledby="edit-benchmark-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <h2
          id="edit-benchmark-title"
          className="text-base font-semibold text-slate-900"
        >
          Edit Benchmark
        </h2>

        {error ? (
          <Alert variant="danger" className="mt-4">
            {error}
          </Alert>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Category
            <select
              className={FIELD}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {BENCHMARK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {BENCHMARK_CATEGORIES.includes(
                category as (typeof BENCHMARK_CATEGORIES)[number]
              ) ? null : (
                <option value={category}>{category}</option>
              )}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Target Name
            <input
              className={FIELD}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Current Status
            <select
              className={FIELD}
              value={status}
              onChange={(e) => setStatus(e.target.value as BenchmarkStatus)}
            >
              {BENCHMARK_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Notes
            <textarea
              className={FIELD}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2
              text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium
              text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
