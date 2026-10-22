import { useState } from "react";
import type { SkaterBenchmark, SkaterBenchmarkPayload } from "@/lib/types";

export const GOAL_CATEGORIES = [
  "Jump",
  "Spin",
  "Step",
  "Component",
  "General/Fitness",
] as const;

const FIELD =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 " +
  "focus:border-slate-500 focus:outline-none";

/** Lightweight inline form to add a standalone goal (no gap-analysis coupling). */
export function GoalForm({
  onSave,
  onCancel,
  saving,
  initialGoal,
}: {
  onSave: (payload: SkaterBenchmarkPayload) => void;
  onCancel: () => void;
  saving: boolean;
  initialGoal?: SkaterBenchmark;
}) {
  const [name, setName] = useState(initialGoal?.name ?? "");
  const [category, setCategory] = useState<string>(
    initialGoal?.category ?? GOAL_CATEGORIES[0]
  );
  const [targetDate, setTargetDate] = useState(initialGoal?.target_date ?? "");
  const [actionPlan, setActionPlan] = useState(initialGoal?.action_plan ?? "");
  const [successCriteria, setSuccessCriteria] = useState(
    initialGoal?.success_criteria ?? ""
  );
  const [notes, setNotes] = useState(initialGoal?.notes ?? "");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      category,
      name: trimmed,
      status: initialGoal?.status ?? "NOT_STARTED",
      target_date: targetDate || null,
      action_plan: actionPlan.trim() || null,
      success_criteria: successCriteria.trim() || null,
      notes: notes.trim() || null,
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="space-y-1">
        <label htmlFor="goal-name" className="text-xs font-medium text-slate-600">
          Goal / Element name
        </label>
        <input
          id="goal-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Consistent 2S"
          className={FIELD}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="goal-category" className="text-xs font-medium text-slate-600">
            Category
          </label>
          <select
            id="goal-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={FIELD}
          >
            {GOAL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="goal-date" className="text-xs font-medium text-slate-600">
            Target date
          </label>
          <input
            id="goal-date"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className={`${FIELD} tabular-nums`}
          />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor="goal-action-plan" className="text-xs font-medium text-slate-600">
          Action Plan (How)
        </label>
        <textarea
          id="goal-action-plan"
          rows={2}
          value={actionPlan}
          onChange={(e) => setActionPlan(e.target.value)}
          placeholder="Concrete steps to get there, e.g. daily take-off drills"
          className={FIELD}
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor="goal-success-criteria"
          className="text-xs font-medium text-slate-600"
        >
          Success Criteria (Measurement)
        </label>
        <textarea
          id="goal-success-criteria"
          rows={2}
          value={successCriteria}
          onChange={(e) => setSuccessCriteria(e.target.value)}
          placeholder="How you'll measure it, e.g. 5/6 clean in two run-throughs"
          className={FIELD}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="goal-notes" className="text-xs font-medium text-slate-600">
          Progress Notes (Optional)
        </label>
        <textarea
          id="goal-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Running log of progress, blockers, and observations"
          className={FIELD}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={saving || !name.trim()}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold
            text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Goal"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm
            font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
