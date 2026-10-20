import type { SkaterProgram } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

/** The two singles program segments every competitor is expected to plan. */
const SEGMENTS = ["SP", "FS"] as const;

/** Compact per-segment status: a primary chip when the layout exists, an amber
 *  "Missing <segment>" warning otherwise. Deterministic, no network. */
export function ProgramChips({ programs }: { programs?: SkaterProgram[] }) {
  const present = new Set((programs ?? []).map((p) => p.program_type));
  return (
    <div className="flex flex-wrap gap-1">
      {SEGMENTS.map((seg) =>
        present.has(seg) ? (
          <Badge key={seg} variant="primary">
            {seg}
          </Badge>
        ) : (
          <Badge key={seg} variant="warning">
            Missing {seg}
          </Badge>
        )
      )}
    </div>
  );
}
