import { Button } from "@/components/ui/button";
import type { YearlyPlanOut } from "@/lib/ytpApi";

interface Props {
  plans: YearlyPlanOut[];
  activePlanId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit?: boolean;
}

const selectCls =
  "h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Season-plan switcher plus plan-level create / edit / delete actions. */
export function YtpToolbar({
  plans,
  activePlanId,
  onSelect,
  onNew,
  onEdit,
  onDelete,
  canEdit = true,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="ytp-plan" className="text-sm font-medium text-slate-600">
          Season plan
        </label>
        <select
          id="ytp-plan"
          className={selectCls}
          value={activePlanId ?? ""}
          onChange={(e) => onSelect(e.target.value)}
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.season_label} — {p.title}
            </option>
          ))}
        </select>
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onEdit}>
            Edit Plan
          </Button>
          <Button type="button" size="sm" variant="danger" onClick={onDelete}>
            Delete Plan
          </Button>
          <Button type="button" size="sm" onClick={onNew}>
            + New Plan
          </Button>
        </div>
      )}
    </div>
  );
}
