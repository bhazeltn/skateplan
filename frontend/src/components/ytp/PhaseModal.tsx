import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PHASE_META } from "@/lib/ytpTimeline";
import { PhaseBenchmarkChecklist } from "@/components/ytp/PhaseBenchmarkChecklist";
import type { SkaterBenchmark } from "@/lib/types";
import type {
  IntensityLevel,
  PhaseType,
  YtpPhaseCreate,
  YtpPhaseOut,
} from "@/lib/ytpApi";

interface Props {
  planStart: string;
  planEnd: string;
  initialPhase?: YtpPhaseOut;
  benchmarks: SkaterBenchmark[];
  onClose: () => void;
  onSubmit: (payload: YtpPhaseCreate) => Promise<void>;
}

const PHASE_TYPES = Object.keys(PHASE_META) as PhaseType[];
const INTENSITIES: IntensityLevel[] = ["low", "moderate", "high", "peak"];
const selectCls =
  "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function initialState(planStart: string, planEnd: string, phase?: YtpPhaseOut) {
  return {
    name: phase?.name ?? "",
    phase_type: (phase?.phase_type ?? "general_prep") as PhaseType,
    start_date: phase?.start_date ?? planStart,
    end_date: phase?.end_date ?? planEnd,
    on_ice: phase?.target_on_ice_hours_per_week?.toString() ?? "",
    off_ice: phase?.target_off_ice_hours_per_week?.toString() ?? "",
    rpe: phase?.target_rpe?.toString() ?? "",
    intensity: (phase?.intensity_level ?? "") as IntensityLevel | "",
    primary_focus: phase?.primary_focus ?? "",
    notes: phase?.notes ?? "",
  };
}

const numOrNull = (v: string): number | null => (v.trim() === "" ? null : Number(v));

/** Create / edit dialog for a training phase, including volume & intensity
 *  targets and a checklist linking the skater's gap benchmarks to the phase. */
export function PhaseModal({
  planStart,
  planEnd,
  initialPhase,
  benchmarks,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState(() => initialState(planStart, planEnd, initialPhase));
  const [benchIds, setBenchIds] = useState<string[]>(initialPhase?.benchmark_ids ?? []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const toggle = (id: string) =>
    setBenchIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.end_date < form.start_date) {
      setError("End date must be on or after the start date.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        name: form.name.trim(),
        phase_type: form.phase_type,
        start_date: form.start_date,
        end_date: form.end_date,
        target_on_ice_hours_per_week: numOrNull(form.on_ice),
        target_off_ice_hours_per_week: numOrNull(form.off_ice),
        target_rpe: numOrNull(form.rpe),
        intensity_level: form.intensity || null,
        primary_focus: form.primary_focus.trim() || null,
        notes: form.notes.trim() || null,
        benchmark_ids: benchIds,
      });
      onClose();
    } catch {
      setError("Could not save the phase. Please try again.");
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
        aria-labelledby="phase-modal-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-lg max-h-[90vh] space-y-3 overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="phase-modal-title" className="text-base font-semibold text-slate-900">
          {initialPhase ? "Edit Phase" : "Add Phase"}
        </h2>
        {error ? <Alert variant="danger">{error}</Alert> : null}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label htmlFor="ph-name">Name</Label>
            <Input id="ph-name" value={form.name} onChange={(e) => set("name")(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="ph-type">Phase type</Label>
            <select id="ph-type" className={selectCls} value={form.phase_type} onChange={(e) => set("phase_type")(e.target.value)}>
              {PHASE_TYPES.map((t) => (
                <option key={t} value={t}>{PHASE_META[t].label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="ph-intensity">Intensity</Label>
            <select id="ph-intensity" className={selectCls} value={form.intensity} onChange={(e) => set("intensity")(e.target.value)}>
              <option value="">—</option>
              {INTENSITIES.map((i) => (
                <option key={i} value={i}>{i.replace(/^\w/, (c) => c.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="ph-start">Start date</Label>
            <Input id="ph-start" type="date" value={form.start_date} onChange={(e) => set("start_date")(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="ph-end">End date</Label>
            <Input id="ph-end" type="date" value={form.end_date} onChange={(e) => set("end_date")(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="ph-onice">On-ice h/wk</Label>
            <Input id="ph-onice" type="number" min="0" step="0.5" value={form.on_ice} onChange={(e) => set("on_ice")(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ph-office">Off-ice h/wk</Label>
            <Input id="ph-office" type="number" min="0" step="0.5" value={form.off_ice} onChange={(e) => set("off_ice")(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ph-rpe">Target RPE (1–10)</Label>
            <Input id="ph-rpe" type="number" min="1" max="10" value={form.rpe} onChange={(e) => set("rpe")(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ph-focus">Primary focus</Label>
            <Input id="ph-focus" value={form.primary_focus} onChange={(e) => set("primary_focus")(e.target.value)} />
          </div>
        </div>

        <div>
          <Label htmlFor="ph-notes">Notes</Label>
          <textarea
            id="ph-notes"
            rows={2}
            className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={form.notes}
            onChange={(e) => set("notes")(e.target.value)}
          />
        </div>

        <div>
          <Label>Target gap benchmarks</Label>
          <PhaseBenchmarkChecklist benchmarks={benchmarks} selected={benchIds} onToggle={toggle} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save Phase"}</Button>
        </div>
      </form>
    </div>
  );
}
