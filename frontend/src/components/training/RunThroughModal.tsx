import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { getProgram } from "@/lib/api";
import type { SkaterProgram } from "@/lib/types";
import type {
  RunThroughCreate,
  RunThroughOut,
  RunThroughUpdate,
  RunType,
} from "@/lib/runThroughsApi";
import { RunThroughElementList, type RtElement } from "./RunThroughElementList";

const textareaCls =
  "flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const RUN_TYPES: { value: RunType; label: string }[] = [
  { value: "full", label: "Full" },
  { value: "half", label: "Half" },
  { value: "section", label: "Section" },
  { value: "walkthrough", label: "Walkthrough" },
];

interface Props {
  sessionId: string;
  programs: SkaterProgram[];
  initial?: RunThroughOut;
  onClose: () => void;
  onSubmit: (payload: RunThroughCreate | RunThroughUpdate) => Promise<void>;
}

function initialRows(r?: RunThroughOut): RtElement[] {
  if (!r) return [];
  return [...r.element_results]
    .sort((a, b) => a.element_order - b.element_order)
    .map((e) => ({ element_code: e.element_code, outcome: e.outcome, tags: e.tags ?? [] }));
}

function Pill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <Button type="button" size="sm" variant={active ? "default" : "outline"} onClick={onClick}>
      {label}
    </Button>
  );
}

/** Create / edit dialog for a program run-through. On create, selecting a program
 *  auto-populates its planned elements (default clean); on edit, the program is
 *  locked and all fields prefill from the run. */
export function RunThroughModal({ sessionId: _s, programs, initial, onClose, onSubmit }: Props) {
  const { token } = useAuth();
  const [programId, setProgramId] = useState(initial?.program_id ?? "");
  const [runType, setRunType] = useState<RunType>((initial?.run_type as RunType) ?? "full");
  const [withMusic, setWithMusic] = useState(initial?.with_music ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [rows, setRows] = useState<RtElement[]>(() => initialRows(initial));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectProgram = async (id: string) => {
    setProgramId(id);
    if (!id) return setRows([]);
    try {
      const detail = await getProgram(id, token);
      const sorted = [...detail.program_elements].sort((a, b) => a.segment_order - b.segment_order);
      setRows(sorted.map((e) => ({ element_code: e.element_code, outcome: "clean", tags: [] })));
    } catch {
      setRows([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programId) return setError("Select a program for this run-through.");
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        program_id: programId, run_type: runType, with_music: withMusic,
        notes: notes.trim() || null,
        element_results: rows.map((r, i) => ({
          element_order: i, element_code: r.element_code, outcome: r.outcome, tags: r.tags,
        })),
      });
      onClose();
    } catch {
      setError("Could not save the run-through. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4"
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="rt-modal-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md max-h-[90vh] space-y-4 overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="rt-modal-title" className="text-base font-semibold text-slate-900">
          {initial ? "Edit Run-Through" : "Log Run-Through"}
        </h2>
        {error ? <Alert variant="danger">{error}</Alert> : null}

        <div>
          <Label htmlFor="rt-program">Program</Label>
          {initial ? (
            <p className="text-sm font-medium text-slate-900">
              {initial.program_name} · {initial.program_segment}
            </p>
          ) : programs.length === 0 ? (
            <p className="text-sm text-slate-400">
              No active programs. Create a program to log run-throughs.
            </p>
          ) : (
            <select
              id="rt-program"
              className={textareaCls}
              value={programId}
              onChange={(e) => void selectProgram(e.target.value)}
            >
              <option value="">Select a program…</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} · {p.program_type}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <Label>Run Type</Label>
          <div className="flex flex-wrap gap-2">
            {RUN_TYPES.map((t) => (
              <Pill
                key={t.value}
                active={runType === t.value}
                label={t.label}
                onClick={() => setRunType(t.value)}
              />
            ))}
          </div>
        </div>

        <div>
          <Label>Music</Label>
          <div className="flex flex-wrap gap-2">
            <Pill active={withMusic} label="With Music" onClick={() => setWithMusic(true)} />
            <Pill active={!withMusic} label="No Music" onClick={() => setWithMusic(false)} />
          </div>
        </div>

        <div>
          <Label>Elements</Label>
          <RunThroughElementList
            rows={rows}
            onOutcome={(i, o) =>
              setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, outcome: o } : r)))
            }
            onTags={(i, t) =>
              setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, tags: t } : r)))
            }
            onRemove={(i) => setRows((rs) => rs.filter((_, idx) => idx !== i))}
            onAdd={(code) =>
              setRows((rs) => [...rs, { element_code: code, outcome: "clean", tags: [] }])
            }
          />
        </div>

        <div>
          <Label htmlFor="rt-notes">Notes</Label>
          <textarea
            id="rt-notes"
            className={textareaCls}
            rows={2}
            value={notes ?? ""}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save Run-Through"}
          </Button>
        </div>
      </form>
    </div>
  );
}
