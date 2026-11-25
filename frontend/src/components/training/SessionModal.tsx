import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { SessionCreate, SessionOut, SessionUpdate } from "@/lib/trainingApi";
import {
  SESSION_TYPES,
  sessionTypeLabel,
} from "@/lib/trainingHelpers";

interface Props {
  skaterId: number | string;
  initial?: SessionOut;
  onClose: () => void;
  onSubmit: (payload: SessionCreate | SessionUpdate) => Promise<void>;
}

const textareaCls =
  "flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const DURATION_PRESETS = [30, 45, 60, 90];
const RPE_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function initialState(s?: SessionOut) {
  return {
    session_date: s?.session_date ?? todayIso(),
    session_type: s?.session_type ?? "on_ice",
    duration_minutes: s?.duration_minutes ?? 60,
    rpe: s?.rpe ?? 7,
    location: s?.location ?? "",
    notes: s?.notes ?? "",
  };
}

function Pill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

/** Create / edit dialog for a training session. Opens pre-filled with sensible
 *  defaults (today, on-ice, 60 min, RPE 7) so it is valid immediately; on edit
 *  it prefills from the session. Delegates the save to the parent. */
export function SessionModal({ skaterId, initial, onClose, onSubmit }: Props) {
  const [form, setForm] = useState(() => initialState(initial));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        ...(initial ? {} : { skater_id: Number(skaterId) }),
        session_date: form.session_date || null,
        session_type: form.session_type,
        duration_minutes: form.duration_minutes,
        rpe: form.rpe,
        location: form.location.trim() || null,
        notes: form.notes.trim() || null,
      } as SessionCreate | SessionUpdate);
      onClose();
    } catch {
      setError("Could not save the session. Please try again.");
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
        aria-labelledby="session-modal-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md max-h-[90vh] space-y-4 overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="session-modal-title" className="text-base font-semibold text-slate-900">
          {initial ? "Edit Session" : "Log Session"}
        </h2>
        {error ? <Alert variant="danger">{error}</Alert> : null}

        <div>
          <Label htmlFor="session-date">Date</Label>
          <Input
            id="session-date"
            type="date"
            value={form.session_date}
            onChange={(e) => set("session_date", e.target.value)}
          />
        </div>

        <div>
          <Label>Type</Label>
          <div className="flex flex-wrap gap-2">
            {SESSION_TYPES.map((t) => (
              <Pill
                key={t}
                active={form.session_type === t}
                label={sessionTypeLabel(t)}
                onClick={() => set("session_type", t)}
              />
            ))}
          </div>
        </div>

        <div>
          <Label>Duration (minutes)</Label>
          <div className="mb-2 flex flex-wrap gap-2">
            {DURATION_PRESETS.map((n) => (
              <Pill
                key={n}
                active={form.duration_minutes === n}
                label={`${n} min`}
                onClick={() => set("duration_minutes", n)}
              />
            ))}
          </div>
          <Input
            type="number"
            min={1}
            aria-label="duration minutes"
            value={form.duration_minutes}
            onChange={(e) => set("duration_minutes", Number(e.target.value))}
          />
        </div>

        <div>
          <Label>RPE (1–10)</Label>
          <div className="flex flex-wrap gap-1">
            {RPE_SCALE.map((n) => (
              <Pill
                key={n}
                active={form.rpe === n}
                label={`RPE ${n}`}
                onClick={() => set("rpe", n)}
              />
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="session-location">Location</Label>
          <Input
            id="session-location"
            value={form.location}
            placeholder="Optional"
            onChange={(e) => set("location", e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="session-notes">Notes</Label>
          <textarea
            id="session-notes"
            className={textareaCls}
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save Session"}
          </Button>
        </div>
      </form>
    </div>
  );
}
