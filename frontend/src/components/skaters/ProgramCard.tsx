import type { SkaterProgram } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

const TYPE_LABELS: Record<string, string> = {
  SP: "Short Program",
  FS: "Free Skate",
};

type LoadedElement = { element_code: string; is_second_half_bonus: boolean };

export function ProgramCard({
  program,
  isExpanded,
  elements,
  isLoading,
  onToggleExpand,
  onEdit,
  onDelete,
  onArchiveToggle,
}: {
  program: SkaterProgram;
  isExpanded: boolean;
  elements?: LoadedElement[];
  isLoading: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchiveToggle: () => void;
}) {
  const p = program;
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {TYPE_LABELS[p.program_type] ?? p.program_type}
            </p>
            <h3 className="text-base font-semibold text-slate-900">{p.title}</h3>
            {p.season && (
              <p className="text-xs text-slate-500 tabular-nums">{p.season}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleExpand}
              className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              {isExpanded ? "Hide Layout" : "View Layout"}
            </button>
            <button
              type="button"
              onClick={onEdit}
              disabled={isLoading}
              className="rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
            >
              Edit
            </button>
            {p.is_archived ? (
              <button
                type="button"
                onClick={onArchiveToggle}
                className="rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
              >
                Restore
              </button>
            ) : (
              <button
                type="button"
                onClick={onArchiveToggle}
                className="rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
              >
                Archive
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-slate-100 pt-3">
            {isLoading ? (
              <p className="text-xs text-slate-400">Loading elements…</p>
            ) : elements && elements.length > 0 ? (
              <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {elements.map((el, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                  >
                    <span className="font-bold text-slate-400">{idx + 1}.</span>
                    <span className="font-semibold text-slate-800">
                      {el.element_code}
                    </span>
                    {el.is_second_half_bonus && (
                      <span className="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">
                        +1.1x
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-slate-400">
                No elements saved in this layout.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
