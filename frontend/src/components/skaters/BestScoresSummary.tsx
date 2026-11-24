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

function HeadlineBest({ label, mark }: { label: string; mark: BestMark | null }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <MarkValue mark={mark} className="text-xl font-semibold text-slate-900" />
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
      <div className="mt-2 flex items-end justify-between gap-2">
        <HeadlineBest label="PB" mark={field.pb} />
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">SB</p>
          <MarkValue mark={field.sb} className="text-lg font-medium text-slate-600" />
        </div>
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
      <div className="mt-2 flex items-end justify-between gap-2">
        <HeadlineBest label="TSS PB" mark={seg.tss.pb} />
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            TSS SB
          </p>
          <MarkValue mark={seg.tss.sb} className="text-lg font-medium text-slate-600" />
        </div>
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
