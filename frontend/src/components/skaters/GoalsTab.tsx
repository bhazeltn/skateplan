import { useState } from "react";
import { GoalForm } from "@/components/skaters/GoalForm";
import { GoalList } from "@/components/skaters/GoalCard";
import { useGoals } from "@/components/skaters/useGoals";
import type { SkaterBenchmarkPayload } from "@/lib/types";

interface GoalsCapabilities {
  can_edit_goals: boolean;
  can_edit_plan: boolean;
}

const FULL: GoalsCapabilities = { can_edit_goals: true, can_edit_plan: true };

/** Standalone goals manager: create, edit, delete and track discrete goals.
 *  Add/Edit are gated on can_edit_goals; Delete only on can_edit_plan. */
export function GoalsTab({
  skaterId,
  capabilities = FULL,
}: {
  skaterId: number | string;
  capabilities?: GoalsCapabilities;
}) {
  const { goals, loading, saving, create, update, remove } = useGoals(skaterId);
  const [adding, setAdding] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const active = goals.filter((g) => g.status !== "MET");
  const completed = goals.filter((g) => g.status === "MET");
  const canEditGoals = capabilities.can_edit_goals;
  const canDelete = capabilities.can_edit_plan;

  async function handleCreate(payload: SkaterBenchmarkPayload) {
    await create(payload);
    setAdding(false);
  }

  async function handleUpdate(payload: SkaterBenchmarkPayload) {
    if (!editingGoalId) return;
    await update(editingGoalId, payload);
    setEditingGoalId(null);
  }

  function handleStatus(id: string, status: SkaterBenchmarkPayload["status"]) {
    update(id, { status });
  }

  function startAdding() {
    setEditingGoalId(null);
    setAdding(true);
  }

  const listProps = {
    editingGoalId,
    saving,
    onEdit: setEditingGoalId,
    onStatusChange: handleStatus,
    onSave: handleUpdate,
    onCancel: () => setEditingGoalId(null),
    onDelete: remove,
    canEditGoals,
    canDelete,
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Goals</h3>
          <p className="text-xs text-slate-500">
            Track discrete standalone goals for this athlete.
          </p>
        </div>
        {canEditGoals && !adding && (
          <button
            type="button"
            onClick={startAdding}
            className="shrink-0 rounded-md bg-slate-900 px-3 py-2 text-sm
              font-semibold text-white hover:bg-slate-800"
          >
            + Add Goal
          </button>
        )}
      </div>

      {canEditGoals && adding && (
        <GoalForm
          onSave={handleCreate}
          onCancel={() => setAdding(false)}
          saving={saving}
        />
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading goals…</p>
      ) : (
        <div className="space-y-4">
          <GoalList
            testId="active-goals"
            heading="Active Goals"
            goals={active}
            {...listProps}
          />
          <GoalList
            testId="completed-goals"
            heading="Completed"
            goals={completed}
            {...listProps}
          />
        </div>
      )}
    </section>
  );
}
