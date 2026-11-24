import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BenchmarkSetForm } from "@/components/gap/BenchmarkSetForm";
import { useBenchmarkSets } from "@/components/gap/useBenchmarkSets";
import type { BenchmarkSetOut } from "@/lib/benchmarkSetsApi";

type Mode = { kind: "list" } | { kind: "create" } | { kind: "edit"; set: BenchmarkSetOut };

/** One row in the manage list with Edit / Delete controls. */
function ManageRow({
  set,
  onEdit,
  onDelete,
}: {
  set: BenchmarkSetOut;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{set.name}</p>
        <p className="text-xs text-slate-400">
          {set.items.length} benchmark{set.items.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button type="button" variant="danger" size="sm" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </li>
  );
}

/** Manage coach-owned benchmark sets: list, create, edit and delete. */
export function ManageBenchmarkSetsModal({ onClose }: { onClose: () => void }) {
  const { sets, loading, error, createSet, updateSet, removeSet } =
    useBenchmarkSets();
  const [mode, setMode] = useState<Mode>({ kind: "list" });

  const handleDelete = async (set: BenchmarkSetOut) => {
    if (!window.confirm(`Delete "${set.name}"? This cannot be undone.`)) return;
    await removeSet(set.id);
  };

  const handleSave = async (payload: Parameters<typeof createSet>[0]) => {
    if (mode.kind === "edit") await updateSet(mode.set.id, payload);
    else await createSet(payload);
    setMode({ kind: "list" });
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
        aria-labelledby="manage-sets-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2
            id="manage-sets-title"
            className="text-base font-semibold text-slate-900"
          >
            {mode.kind === "list"
              ? "Manage Benchmark Sets"
              : mode.kind === "edit"
              ? "Edit Set"
              : "New Set"}
          </h2>
          {mode.kind === "list" ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setMode({ kind: "create" })}
            >
              + New Set
            </Button>
          ) : null}
        </div>

        {error ? (
          <Alert variant="danger" className="mt-4">
            {error}
          </Alert>
        ) : null}

        <div className="mt-4">
          {mode.kind === "create" ? (
            <BenchmarkSetForm
              onSave={handleSave}
              onCancel={() => setMode({ kind: "list" })}
            />
          ) : mode.kind === "edit" ? (
            <BenchmarkSetForm
              initial={mode.set}
              onSave={handleSave}
              onCancel={() => setMode({ kind: "list" })}
            />
          ) : loading ? (
            <p className="text-sm text-slate-400">Loading sets…</p>
          ) : sets.length === 0 ? (
            <p className="text-sm text-slate-500">
              No benchmark sets yet. Use “+ New Set” to create your first reusable
              set.
            </p>
          ) : (
            <ul className="space-y-2">
              {sets.map((set) => (
                <ManageRow
                  key={set.id}
                  set={set}
                  onEdit={() => setMode({ kind: "edit", set })}
                  onDelete={() => handleDelete(set)}
                />
              ))}
            </ul>
          )}
        </div>

        {mode.kind === "list" ? (
          <div className="mt-6 flex justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
