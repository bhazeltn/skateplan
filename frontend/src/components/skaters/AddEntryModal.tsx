import { useEffect, useState, type FormEvent } from "react";
import { CompetitionSelector } from "@/components/skaters/CompetitionSelector";
import { useAuth } from "@/context/AuthContext";
import { listLevels } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import type {
  CompetitionOut,
  EntryPayload,
  LevelListItem,
  SkaterProgram,
} from "@/lib/types";

interface Props {
  skaterId: number;
  programs: SkaterProgram[];
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: EntryPayload) => Promise<void> | void;
}

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 " +
  "text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-ring";

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
      <Label htmlFor="entry-level">Level</Label>
      <select id="entry-level" value={value} className={SELECT_CLASS}
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

export function AddEntryModal({ skaterId, open, onClose, onSubmit }: Props) {
  const levels = useLevels();
  const [competition, setCompetition] = useState<CompetitionOut | null>(null);
  const [level, setLevel] = useState("");
  const [sp, setSp] = useState(false);
  const [fs, setFs] = useState(false);

  if (!open) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!competition) return;
    await onSubmit({
      competition_id: competition.id,
      skater_id: skaterId,
      level_id: level === "" ? null : Number(level),
      sp_program_id: null,
      fs_program_id: null,
    });
    onClose();
  }

  return (
    <div role="presentation" onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="add-entry-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 id="add-entry-title" className="mb-4 text-lg font-semibold text-slate-900">
          Add Entry
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <CompetitionSelector value={competition} onSelect={setCompetition}
            onClear={() => setCompetition(null)} />
          <LevelSelect levels={levels} value={level} onChange={setLevel} />
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium text-slate-700">
              Programs
            </legend>
            <ProgramCheckbox id="entry-sp" label="Entering Short Program"
              checked={sp} onChange={setSp} />
            <ProgramCheckbox id="entry-fs" label="Entering Free Skate"
              checked={fs} onChange={setFs} />
          </fieldset>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Entry</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
