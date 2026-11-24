import { Button } from "@/components/ui/button";
import type { SegmentResultOut } from "@/lib/types";

interface Props {
  segment: "SP" | "FS";
  result?: SegmentResultOut;
  canLog: boolean;
  onLog: () => void;
  onEdit: () => void;
}

const LABEL: Record<"SP" | "FS", string> = {
  SP: "Short Program",
  FS: "Free Skate",
};

/** One segment (SP or FS) block: shows the recorded TSS with an Edit button,
 *  or a Log button when no result exists yet. */
export function SegmentResultDisplay({
  segment,
  result,
  canLog,
  onLog,
  onEdit,
}: Props) {
  return (
    <div data-testid={`segment-${segment}`}
      className="flex items-center justify-end gap-3 text-right">
      <span title={LABEL[segment]}
        className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {segment}
      </span>
      {result ? (
        <div className="flex items-center gap-3">
          <div className="space-y-0.5">
            <p className="tabular-nums text-sm font-semibold text-slate-900">
              TSS {result.tss?.toFixed(2)}
            </p>
            {result.segment_rank != null && (
              <p className="tabular-nums text-xs text-slate-500">
                Rank {result.segment_rank}
              </p>
            )}
          </div>
          <Button type="button" variant="outline" onClick={onEdit}>
            Edit {segment}
          </Button>
        </div>
      ) : canLog ? (
        <Button type="button" variant="outline" onClick={onLog}>
          Log {segment}
        </Button>
      ) : (
        <span className="text-xs text-slate-400">—</span>
      )}
    </div>
  );
}
