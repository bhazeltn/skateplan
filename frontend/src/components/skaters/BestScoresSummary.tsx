import type {
  BestMark,
  FieldBest,
  SegmentBests,
  SkaterBests,
} from "@/lib/competitionBests";

const CARD = "rounded-md border border-slate-200 bg-white p-3";

const fmt = (m: BestMark | null) => (m ? m.value.toFixed(2) : "—");
const tip = (m: BestMark | null) =>
  m ? `${m.competitionName}${m.date ? ` · ${m.date}` : ""}` : undefined;

function MarkValue({
  mark,
  className,
}: {
  mark: BestMark | null;
  className?: string;
}) {
  return (
    <span className={`tabular-nums ${className ?? ""}`} title={tip(mark)}>
      {fmt(mark)}
    </span>
  );
}

interface CellProps {
  label: string;
  mark: BestMark | null;
  align?: "left" | "right";
  emphasized?: boolean;
}

/** One headline PB/SB value with its label and (when present) a visible
 *  competition / date provenance block. */
function BestMarkCell({ label, mark, align = "left", emphasized = false }: CellProps) {
  const right = align === "right";
  const score = emphasized
    ? "text-lg font-semibold tabular-nums"
    : "text-lg font-medium text-slate-700 tabular-nums";
  return (
    <div className={`min-w-0 ${right ? "text-right" : ""}`}>
      <p className={`text-xs text-slate-500 ${right ? "text-right" : ""}`}>{label}</p>
      <p className={score}>{mark ? mark.value.toFixed(2) : "—"}</p>
      {mark && (
        <div title={`${mark.competitionName} (${mark.date})`}>
          <p className="truncate text-[11px] text-slate-500 mt-0.5">
            {mark.competitionName}
          </p>
          <p className="text-[11px] text-slate-400 tabular-nums">{mark.date}</p>
        </div>
      )}
    </div>
  );
}

function PbSbRow({ label, field }: { label: string; field: FieldBest }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-slate-400">PB</span>
        <MarkValue mark={field.pb} className="font-medium text-slate-900" />
        <span className="text-slate-400">SB</span>
        <MarkValue mark={field.sb} className="text-slate-600" />
      </span>
    </div>
  );
}

function TotalCard({ field }: { field: FieldBest }) {
  return (
    <div data-testid="best-card-total" className={CARD}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Combined Total
      </p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <BestMarkCell label="PB" mark={field.pb} emphasized />
        <BestMarkCell label="SB" mark={field.sb} align="right" />
      </div>
    </div>
  );
}

function SegmentBestsCard({
  testid,
  title,
  seg,
}: {
  testid: string;
  title: string;
  seg: SegmentBests;
}) {
  return (
    <div data-testid={testid} className={CARD}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <BestMarkCell label="TSS PB" mark={seg.tss.pb} emphasized />
        <BestMarkCell label="TSS SB" mark={seg.tss.sb} align="right" />
      </div>
      <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
        <PbSbRow label="TES" field={seg.tes} />
        <PbSbRow label="PCS" field={seg.pcs} />
      </div>
    </div>
  );
}

function hasAnyPb(b: SkaterBests): boolean {
  return Boolean(
    b.total.pb ||
      b.sp.tss.pb || b.sp.tes.pb || b.sp.pcs.pb ||
      b.fs.tss.pb || b.fs.tes.pb || b.fs.pcs.pb
  );
}

/** Career PB / season SB strip across Combined Total, Short Program and Free
 *  Skate. Renders nothing until the skater has at least one recorded best. */
export function BestScoresSummary({
  bests,
  seasonLabel,
}: {
  bests: SkaterBests;
  seasonLabel: string;
}) {
  if (!hasAnyPb(bests)) return null;
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-sm font-semibold text-slate-900">Best Scores</h4>
        <span className="text-xs text-slate-500">{seasonLabel} Season</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <TotalCard field={bests.total} />
        <SegmentBestsCard testid="best-card-sp" title="Short Program" seg={bests.sp} />
        <SegmentBestsCard testid="best-card-fs" title="Free Skate" seg={bests.fs} />
      </div>
    </div>
  );
}
