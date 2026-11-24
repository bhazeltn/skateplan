/** Compact PB (personal best, indigo) / SB (season best, emerald) pill.
 *  Renders nothing when kind is null. */
export function BestPill({ kind }: { kind: "PB" | "SB" | null }) {
  if (!kind) return null;
  const cls =
    kind === "PB"
      ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
      : "bg-emerald-100 text-emerald-800 border border-emerald-200";
  return (
    <span data-testid={`best-pill-${kind.toLowerCase()}`}
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px]
        font-semibold ${cls}`}>
      {kind}
    </span>
  );
}
