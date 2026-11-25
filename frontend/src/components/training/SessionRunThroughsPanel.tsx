import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import type { SkaterProgram } from "@/lib/types";
import {
  createRunThrough,
  deleteRunThrough,
  listSessionRunThroughs,
  updateRunThrough,
  type RunThroughCreate,
  type RunThroughOut,
  type RunThroughUpdate,
} from "@/lib/runThroughsApi";
import { outcomeLabel } from "@/lib/trainingHelpers";
import { RunThroughModal } from "./RunThroughModal";

interface Props {
  sessionId: string;
  programs: SkaterProgram[];
  onRunThroughsChanged: () => void;
}

const RUN_TYPE_LABELS: Record<string, string> = {
  full: "Full", half: "Half", section: "Section", walkthrough: "Walkthrough",
};

function chipCls(outcome: string): string {
  if (outcome === "clean") return "bg-emerald-100 text-emerald-700";
  if (outcome === "fall") return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

function cleanFraction(run: RunThroughOut): string {
  const total = run.element_results.length;
  const clean = run.element_results.filter((e) => e.outcome === "clean").length;
  return `${clean}/${total} clean`;
}

function RunThroughItem({
  run,
  onEdit,
  onDelete,
}: {
  run: RunThroughOut;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-900">{run.program_name}</span>
        <Badge variant="primary">{run.program_segment}</Badge>
        <Badge variant="default">{RUN_TYPE_LABELS[run.run_type] ?? run.run_type}</Badge>
        <span className="text-xs text-slate-500">
          {run.with_music ? "♪ With Music" : "No Music"}
        </span>
        <span className="ml-auto text-xs font-semibold text-slate-700">
          {cleanFraction(run)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {run.element_results.map((e) => (
          <span
            key={e.id}
            className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${chipCls(e.outcome)}`}
          >
            {e.element_code} · {outcomeLabel(e.outcome)}
          </span>
        ))}
      </div>
      {run.notes ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{run.notes}</p>
      ) : null}
      <div className="mt-2 flex gap-1">
        <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
          Edit
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-rose-600 hover:bg-rose-50"
          onClick={onDelete}
        >
          Delete
        </Button>
      </div>
    </li>
  );
}

/** Expanded run-through tracker for a session. Lazy-loads run-throughs, offers a
 *  create/edit modal, and confirm-guarded delete. Notifies the parent after any
 *  mutation so program-consistency analytics refresh. */
export function SessionRunThroughsPanel({ sessionId, programs, onRunThroughsChanged }: Props) {
  const { token } = useAuth();
  const [runs, setRuns] = useState<RunThroughOut[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RunThroughOut | null>(null);

  const reload = useCallback(() => {
    return listSessionRunThroughs(sessionId, token).then(setRuns).catch(() => {});
  }, [sessionId, token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const afterMutation = async () => {
    await reload();
    onRunThroughsChanged();
  };

  const handleSubmit = async (payload: RunThroughCreate | RunThroughUpdate) => {
    if (editing) await updateRunThrough(sessionId, editing.id, payload, token);
    else await createRunThrough(sessionId, payload as RunThroughCreate, token);
    await afterMutation();
  };

  const remove = async (run: RunThroughOut) => {
    if (!window.confirm("Delete this run-through?")) return;
    await deleteRunThrough(sessionId, run.id, token);
    await afterMutation();
  };

  return (
    <div
      data-testid="run-throughs-panel"
      className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Run-Throughs
        </span>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          + Log Run-Through
        </Button>
      </div>

      {runs.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-400">
          No run-throughs logged for this session.
        </p>
      ) : (
        <ul className="space-y-2">
          {runs.map((r) => (
            <RunThroughItem
              key={r.id}
              run={r}
              onEdit={() => {
                setEditing(r);
                setModalOpen(true);
              }}
              onDelete={() => void remove(r)}
            />
          ))}
        </ul>
      )}

      {modalOpen ? (
        <RunThroughModal
          sessionId={sessionId}
          programs={programs}
          initial={editing ?? undefined}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  );
}
