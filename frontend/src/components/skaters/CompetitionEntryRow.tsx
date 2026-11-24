import { Button } from "@/components/ui/button";
import EntryResultBadge, {
  computeEntrySummary,
  getPodiumAccentClass,
} from "@/components/skaters/EntryResultBadge";
import { SegmentResultDisplay } from "@/components/skaters/SegmentResultDisplay";
import type { JoinedEntry } from "@/components/skaters/useSkaterEntries";
import type { SegmentResultOut, SkaterProgram } from "@/lib/types";

export interface ResultModalRequest {
  entryId: string;
  segment?: "SP" | "FS";
  initialResult?: SegmentResultOut;
}

interface Props {
  item: JoinedEntry;
  programs: SkaterProgram[];
  onResult: (req: ResultModalRequest) => void;
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

function EntryHeader({
  name,
  start,
  upcoming,
  overallRank,
  totalScore,
  chips,
}: {
  name: string;
  start: string;
  upcoming: boolean;
  overallRank: number | null;
  totalScore: number | null;
  chips: (string | undefined)[];
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-slate-900">{name}</p>
        <EntryResultBadge rank={overallRank} />
        {upcoming && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs
            font-semibold text-amber-700">
            Upcoming
          </span>
        )}
      </div>
      {start && <p className="tabular-nums text-xs text-slate-500">{start}</p>}
      {totalScore !== null && (
        <div className="flex items-baseline gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Total
          </span>
          <span className="text-base font-semibold text-slate-900 tabular-nums">
            {totalScore.toFixed(2)}
          </span>
        </div>
      )}
      {chips.some(Boolean) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {chips.map((c, i) => c && <Chip key={i}>{c}</Chip>)}
        </div>
      )}
    </div>
  );
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cls = "text-xs font-semibold text-slate-500 hover:text-slate-900";
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

/** Right-hand results column: explicit SP/FS blocks when the entry declares
 *  which segments it is competing, else a legacy single Log Results control. */
function ResultColumn({
  item,
  upcoming,
  onResult,
}: {
  item: JoinedEntry;
  upcoming: boolean;
  onResult: (req: ResultModalRequest) => void;
}) {
  const { entry, results } = item;
  const bySegment = (seg: "SP" | "FS") => results.find((r) => r.segment === seg);
  const hasFlags = Boolean(entry.entered_sp || entry.entered_fs);
  const segments = (["SP", "FS"] as const).filter((s) =>
    s === "SP" ? entry.entered_sp : entry.entered_fs
  );

  if (hasFlags) {
    return (
      <div className="space-y-2">
        {segments.map((seg) => (
          <SegmentResultDisplay key={seg} segment={seg} result={bySegment(seg)}
            canLog={!upcoming}
            onLog={() => onResult({ entryId: entry.id, segment: seg })}
            onEdit={() =>
              onResult({ entryId: entry.id, initialResult: bySegment(seg) })
            } />
        ))}
      </div>
    );
  }

  const result = results[0];
  if (result) {
    return (
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
    );
  }

  if (upcoming) return null;
  return (
    <Button type="button" variant="outline"
      onClick={() => onResult({ entryId: entry.id })}>
      Log Results
    </Button>
  );
}

export function CompetitionEntryRow({
  item,
  programs,
  onResult,
  onEdit,
  onDelete,
}: Props) {
  const { entry, competition, results } = item;
  const name = competition?.name ?? "Unknown competition";
  const start = competition?.start_date ?? "";
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = Boolean(start) && start > today;
  const titleOf = (id?: string | null) =>
    programs.find((p) => p.id === id)?.title;
  const { totalScore, overallRank } = computeEntrySummary(results);
  const accent = getPodiumAccentClass(overallRank);

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      onDelete(entry.id);
    }
  };

  return (
    <li data-testid={`entry-${entry.id}`}
      className={`flex items-start justify-between gap-3 rounded-md border
        border-slate-200 bg-white p-4 ${accent}`}>
      <EntryHeader name={name} start={start} upcoming={upcoming}
        overallRank={overallRank} totalScore={totalScore}
        chips={[titleOf(entry.sp_program_id), titleOf(entry.fs_program_id)]} />
      <div className="flex shrink-0 flex-col items-end gap-2 text-right">
        <ResultColumn item={item} upcoming={upcoming} onResult={onResult} />
        <RowActions onEdit={() => onEdit(item)} onDelete={handleDelete} />
      </div>
    </li>
  );
}
