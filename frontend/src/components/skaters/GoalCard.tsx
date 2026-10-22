import { GoalForm } from "@/components/skaters/GoalForm";
import type { SkaterBenchmark, SkaterBenchmarkPayload } from "@/lib/types";

/** Canonical benchmark status flow: NOT_STARTED → DEVELOPING → SOLIDIFYING → MET. */
export const STATUS_OPTIONS = [
  ["NOT_STARTED", "Not Started"],
  ["DEVELOPING", "Developing"],
  ["SOLIDIFYING", "Solidifying"],
  ["MET", "Met / Achieved"],
] as const;

const STATUS_CLS: Record<string, string> = {
  NOT_STARTED: "border-slate-300 bg-slate-100 text-slate-700",
  DEVELOPING: "border-rose-300 bg-rose-50 text-rose-700",
  SOLIDIFYING: "border-amber-300 bg-amber-50 text-amber-700",
  MET: "border-emerald-300 bg-emerald-50 text-emerald-700",
};

type StatusValue = SkaterBenchmarkPayload["status"];

/** Read-only goal card with an inline status dropdown and an Edit action. */
export function GoalCard({
  goal,
  onEdit,
  onStatusChange,
}: {
  goal: SkaterBenchmark;
  onEdit: (id: string) => void;
  onStatusChange: (id: string, status: StatusValue) => void;
}) {
  const cls = STATUS_CLS[goal.status] ?? STATUS_CLS.NOT_STARTED;
  return (
    <li className="space-y-2 rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{goal.name}</p>
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-600">{goal.category}</span>
            {goal.target_date && (
              <span className="tabular-nums"> · by {goal.target_date}</span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <select
            aria-label={`Status for ${goal.name}`}
            value={goal.status}
            onChange={(e) => onStatusChange(goal.id, e.target.value as StatusValue)}
            className={`rounded-md border px-2 py-1 text-xs font-medium ${cls}`}
          >
            {STATUS_OPTIONS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onEdit(goal.id)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1
              text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Edit
          </button>
        </div>
      </div>
      {goal.action_plan && (
        <p className="text-xs text-slate-600">
          <span className="font-semibold text-slate-500">How: </span>
          {goal.action_plan}
        </p>
      )}
      {goal.success_criteria && (
        <p className="text-xs text-slate-600">
          <span className="font-semibold text-slate-500">Measure: </span>
          {goal.success_criteria}
        </p>
      )}
      {goal.notes && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
            Progress Notes
          </p>
          <p className="whitespace-pre-line text-xs italic text-slate-600">
            {goal.notes}
          </p>
        </div>
      )}
    </li>
  );
}

/** A titled list of goals; the goal being edited is replaced by an inline form. */
export function GoalList({
  testId,
  heading,
  goals,
  editingGoalId,
  saving,
  onEdit,
  onStatusChange,
  onSave,
  onCancel,
}: {
  testId: string;
  heading: string;
  goals: SkaterBenchmark[];
  editingGoalId: string | null;
  saving: boolean;
  onEdit: (id: string) => void;
  onStatusChange: (id: string, status: StatusValue) => void;
  onSave: (payload: SkaterBenchmarkPayload) => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-2" data-testid={testId}>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {heading} ({goals.length})
      </h4>
      {goals.length === 0 ? (
        <p className="text-xs text-slate-400">None yet.</p>
      ) : (
        <ul className="space-y-2">
          {goals.map((g) =>
            editingGoalId === g.id ? (
              <li key={g.id}>
                <GoalForm
                  initialGoal={g}
                  onSave={onSave}
                  onCancel={onCancel}
                  saving={saving}
                />
              </li>
            ) : (
              <GoalCard
                key={g.id}
                goal={g}
                onEdit={onEdit}
                onStatusChange={onStatusChange}
              />
            )
          )}
        </ul>
      )}
    </div>
  );
}
