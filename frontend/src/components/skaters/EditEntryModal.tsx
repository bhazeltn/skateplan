import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { listLevels, updateEntry } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/input";
import type {
  CompetitionOut,
  EntryOut,
  EntryUpdate,
  LevelListItem,
} from "@/lib/types";

interface Props {
  open: boolean;
  initialEntry: EntryOut;
  competition?: CompetitionOut;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 " +
  "text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-ring";

const STATUSES = ["registered", "completed", "withdrawn"];

/** Load the Singles competitive levels once per mounted modal. */
function useLevels(): LevelListItem[] {
  const { token } = useAuth();
  const [levels, setLevels] = useState<LevelListItem[]>([]);
  useEffect(() => {
    let active = true;
    listLevels(token)
      .then((r) => active && setLevels(r))
      .catch(() => active && setLevels([]));
    return () => {
      active = false;
    };
  }, [token]);
  return levels;
}

function LevelSelect({
  levels,
  value,
  onChange,
}: {
  levels: LevelListItem[];
  value: string;
  onChange: (v: string) => void;
}) {
  const feds = Array.from(new Set(levels.map((l) => l.federation_name)));
  return (
    <div>
      <Label htmlFor="edit-entry-level">Level</Label>
      <select id="edit-entry-level" value={value} className={SELECT_CLASS}
        onChange={(e) => onChange(e.target.value)}>
        <option value="">— Select level —</option>
        {feds.map((fed) => (
          <optgroup key={fed} label={fed}>
            {levels.filter((l) => l.federation_name === fed).map((l) => (
              <option key={l.level_id} value={l.level_id}>{l.level_name}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

function ProgramCheckbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm text-slate-700">
      <input id={id} type="checkbox" checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-slate-900
          focus-visible:ring-2 focus-visible:ring-ring" />
      {label}
    </label>
  );
}

function CompetitionHeader({ competition }: { competition?: CompetitionOut }) {
  return (
    <div className="mb-4 rounded-md bg-slate-50 px-3 py-2">
      <p className="text-sm font-semibold text-slate-900">
        {competition?.name ?? "Unknown competition"}
      </p>
      {competition?.start_date && (
        <p className="tabular-nums text-xs text-slate-500">
          {competition.start_date}
          {competition.end_date ? ` – ${competition.end_date}` : ""}
        </p>
      )}
    </div>
  );
}

export function EditEntryModal({
  open,
  initialEntry,
  competition,
  onClose,
  onSaved,
}: Props) {
  const { token } = useAuth();
  const levels = useLevels();
  const [level, setLevel] = useState(
    initialEntry.level_id != null ? String(initialEntry.level_id) : ""
  );
  const [sp, setSp] = useState(initialEntry.entered_sp);
  const [fs, setFs] = useState(initialEntry.entered_fs);
  const [status, setStatus] = useState(initialEntry.status);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  function buildPayload(): EntryUpdate {
    return {
      level_id: level === "" ? null : Number(level),
      sp_program_id: null,
      fs_program_id: null,
      entered_sp: sp,
      entered_fs: fs,
      status,
    };
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await updateEntry(initialEntry.id, buildPayload(), token);
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save entry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div role="presentation" onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="edit-entry-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 id="edit-entry-title" className="mb-4 text-lg font-semibold text-slate-900">
          Edit Entry
        </h2>
        <CompetitionHeader competition={competition} />
        <form onSubmit={submit} className="space-y-4">
          <LevelSelect levels={levels} value={level} onChange={setLevel} />
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium text-slate-700">
              Programs
            </legend>
            <ProgramCheckbox id="edit-sp" label="Entering Short Program"
              checked={sp} onChange={setSp} />
            <ProgramCheckbox id="edit-fs" label="Entering Free Skate"
              checked={fs} onChange={setFs} />
          </fieldset>
          <div>
            <Label htmlFor="entry-status">Status</Label>
            <select id="entry-status" value={status} className={SELECT_CLASS}
              onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-3 pt-2">
            {error && <Alert variant="danger">{error}</Alert>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={saving}>Save Changes</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
