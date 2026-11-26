import { Button } from "@/components/ui/button";
import { BENCHMARK_STATUSES } from "@/components/gap/gapScoring";
import type { BenchmarkStatus, SkaterBenchmark } from "@/lib/types";
import type { YtpPhaseOut } from "@/lib/ytpApi";
import { PHASE_META, weeksBetween } from "@/lib/ytpTimeline";
import type { TimelineCompetition } from "@/components/ytp/YtpTimeline";

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  BENCHMARK_STATUSES.map((s) => [s.value, s.label])
);

const STATUS_PILL: Record<BenchmarkStatus, string> = {
  NOT_STARTED: "border-slate-300 bg-slate-100 text-slate-600",
  DEVELOPING: "border-amber-300 bg-amber-50 text-amber-700",
  SOLIDIFYING: "border-sky-300 bg-sky-50 text-sky-700",
  MET: "border-emerald-300 bg-emerald-50 text-emerald-700",
};

interface Props {
  phase: YtpPhaseOut;
  benchmarks: SkaterBenchmark[];
  competitions?: TimelineCompetition[];
  onEdit: (phase: YtpPhaseOut) => void;
  onDelete: (phase: YtpPhaseOut) => void;
  canEdit?: boolean;
}

/** One labelled metric when a value is present. */
function Target({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="rounded-md bg-slate-50 px-2 py-1">
      <dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

/** A status-coloured pill for a benchmark targeted by this phase. */
function BenchmarkPill({ bench }: { bench: SkaterBenchmark }) {
  return (
    <li
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${STATUS_PILL[bench.status]}`}
    >
      <span className="font-medium">{bench.name}</span>
      <span className="opacity-70">· {STATUS_LABEL[bench.status] ?? bench.status}</span>
    </li>
  );
}

/** A detailed card for one training phase: type badge, dates/weeks, volume and
 *  intensity targets, focus/notes, competitions in window, linked benchmarks,
 *  and edit / confirm-guarded delete actions. */
export function YtpPhaseCard({
  phase,
  benchmarks,
  competitions = [],
  onEdit,
  onDelete,
  canEdit = true,
}: Props) {
  const meta = PHASE_META[phase.phase_type];
  const weeks = weeksBetween(phase.start_date, phase.end_date);
  const linked = benchmarks.filter((b) => phase.benchmark_ids.includes(b.id));
  const inWindow = competitions.filter(
    (c) => c.date >= phase.start_date && c.date <= phase.end_date
  );

  const handleDelete = () => {
    if (window.confirm(`Delete phase "${phase.name}"? This cannot be undone.`)) {
      onDelete(phase);
    }
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900">{phase.name}</h4>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}
            >
              {meta.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {phase.start_date} → {phase.end_date} · {weeks} week{weeks === 1 ? "" : "s"}
          </p>
        </div>
        {canEdit && (
          <div className="flex shrink-0 gap-1">
            <Button type="button" size="sm" variant="outline" onClick={() => onEdit(phase)}>
              Edit
            </Button>
            <Button type="button" size="sm" variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Target label="On-ice h/wk" value={phase.target_on_ice_hours_per_week} />
        <Target label="Off-ice h/wk" value={phase.target_off_ice_hours_per_week} />
        <Target label="Target Effort" value={phase.target_rpe} />
        <Target
          label="Intensity"
          value={phase.intensity_level ? phase.intensity_level.replace(/^\w/, (c) => c.toUpperCase()) : null}
        />
      </dl>

      {phase.primary_focus ? (
        <p className="mt-3 text-sm text-slate-700">
          <span className="font-medium text-slate-500">Focus: </span>
          {phase.primary_focus}
        </p>
      ) : null}
      {phase.notes ? (
        <p className="mt-1 text-sm text-slate-600">{phase.notes}</p>
      ) : null}

      {inWindow.length > 0 ? (
        <p className="mt-3 text-xs text-rose-600">
          Competitions: {inWindow.map((c) => c.name).join(", ")}
        </p>
      ) : null}

      <div className="mt-3">
        <p className="text-[10px] uppercase tracking-wide text-slate-400">
          Targeted benchmarks
        </p>
        {linked.length > 0 ? (
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {linked.map((b) => (
              <BenchmarkPill key={b.id} bench={b} />
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-slate-400">No benchmarks linked.</p>
        )}
      </div>
    </article>
  );
}
