import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { defaultSeasonRange } from "@/lib/ytpTimeline";
import type {
  YearlyPlanCreate,
  YearlyPlanOut,
  YearlyPlanUpdate,
} from "@/lib/ytpApi";

interface Props {
  initialPlan?: YearlyPlanOut;
  onClose: () => void;
  onSubmit: (payload: YearlyPlanCreate | YearlyPlanUpdate) => Promise<void>;
}

const textareaCls =
  "flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function initialState(plan?: YearlyPlanOut) {
  const season = defaultSeasonRange();
  return {
    season_label: plan?.season_label ?? season.season_label,
    title: plan?.title ?? `${season.season_label} Season Plan`,
    start_date: plan?.start_date ?? season.start_date,
    end_date: plan?.end_date ?? season.end_date,
    primary_goal: plan?.primary_goal ?? "",
    notes: plan?.notes ?? "",
  };
}

/** Create / edit dialog for a yearly plan. Prefills the current skating season
 *  on create; validates the date order before delegating the save to the parent. */
export function PlanModal({ initialPlan, onClose, onSubmit }: Props) {
  const [form, setForm] = useState(() => initialState(initialPlan));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

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
        season_label: form.season_label.trim(),
        title: form.title.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        primary_goal: form.primary_goal.trim() || null,
        notes: form.notes.trim() || null,
      });
      onClose();
    } catch {
      setError("Could not save the plan. Please try again.");
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
        aria-labelledby="plan-modal-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md max-h-[90vh] space-y-3 overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="plan-modal-title" className="text-base font-semibold text-slate-900">
          {initialPlan ? "Edit Season Plan" : "New Season Plan"}
        </h2>

        {error ? <Alert variant="danger">{error}</Alert> : null}

        <div>
          <Label htmlFor="plan-title">Title</Label>
          <Input
            id="plan-title"
            value={form.title}
            onChange={(e) => set("title")(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="plan-season">Season</Label>
          <Input
            id="plan-season"
            value={form.season_label}
            onChange={(e) => set("season_label")(e.target.value)}
            placeholder="2026-27"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="plan-start">Start date</Label>
            <Input
              id="plan-start"
              type="date"
              value={form.start_date}
              onChange={(e) => set("start_date")(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="plan-end">End date</Label>
            <Input
              id="plan-end"
              type="date"
              value={form.end_date}
              onChange={(e) => set("end_date")(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="plan-goal">Primary goal</Label>
          <textarea
            id="plan-goal"
            className={textareaCls}
            rows={2}
            value={form.primary_goal}
            onChange={(e) => set("primary_goal")(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="plan-notes">Notes</Label>
          <textarea
            id="plan-notes"
            className={textareaCls}
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes")(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save Plan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
