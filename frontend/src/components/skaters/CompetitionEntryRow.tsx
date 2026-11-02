import { Button } from "@/components/ui/button";
import type { JoinedEntry } from "@/components/skaters/useSkaterEntries";
import type { SkaterProgram } from "@/lib/types";

interface Props {
  item: JoinedEntry;
  programs: SkaterProgram[];
  onLogResults: (entryId: string) => void;
  onEdit: (item: JoinedEntry) => void;
  onDelete: (entryId: string) => void;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cls =
    "text-xs font-semibold text-slate-500 hover:text-slate-900";
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onEdit} className={cls}>Edit Entry</button>
      <button type="button" onClick={onDelete}
        className="text-xs font-semibold text-red-500 hover:text-red-700">
        Delete Entry
      </button>
    </div>
  );
}

export function CompetitionEntryRow({
  item,
  programs,
  onLogResults,
  onEdit,
  onDelete,
}: Props) {
  const { entry, competition, results } = item;
  const name = competition?.name ?? "Unknown competition";
  const start = competition?.start_date ?? "";
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = Boolean(start) && start > today;
  const result = results[0];
  const titleOf = (id?: string | null) =>
    programs.find((p) => p.id === id)?.title;
  const sp = titleOf(entry.sp_program_id);
  const fs = titleOf(entry.fs_program_id);

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      onDelete(entry.id);
    }
  };

  return (
    <li data-testid={`entry-${entry.id}`}
      className="flex items-start justify-between gap-3 rounded-md border
        border-slate-200 bg-white p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{name}</p>
          {upcoming && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs
              font-semibold text-amber-700">
              Upcoming
            </span>
          )}
        </div>
        {start && (
          <p className="tabular-nums text-xs text-slate-500">{start}</p>
        )}
        {(sp || fs) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {sp && <Chip>{sp}</Chip>}
            {fs && <Chip>{fs}</Chip>}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2 text-right">
        {result ? (
          <div className="space-y-0.5">
            <p className="tabular-nums text-sm font-semibold text-slate-900">
              TSS {result.tss?.toFixed(2)}
            </p>
            {result.overall_rank != null && (
              <p className="tabular-nums text-xs text-slate-500">
                Overall {result.overall_rank}
              </p>
            )}
          </div>
        ) : (
          !upcoming && (
            <Button type="button" variant="outline"
              onClick={() => onLogResults(entry.id)}>
              Log Results
            </Button>
          )
        )}
        <RowActions onEdit={() => onEdit(item)} onDelete={handleDelete} />
      </div>
    </li>
  );
}
