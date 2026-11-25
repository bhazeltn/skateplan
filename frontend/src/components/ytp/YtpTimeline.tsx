import type { YearlyPlanOut, YtpPhaseOut } from "@/lib/ytpApi";
import {
  PHASE_META,
  computeBarPosition,
  computeMarkerPosition,
  getMonthTicks,
  weeksBetween,
} from "@/lib/ytpTimeline";

export interface TimelineCompetition {
  name: string;
  date: string;
}

interface Props {
  plan: YearlyPlanOut;
  competitions?: TimelineCompetition[];
  onPhaseClick?: (phase: YtpPhaseOut) => void;
}

/** Month labels across the top of the timeline band. */
function MonthAxis({ start, end }: { start: string; end: string }) {
  const ticks = getMonthTicks(start, end);
  return (
    <div className="relative mb-1 h-4">
      {ticks.map((t, i) => (
        <span
          key={`${t.label}-${i}`}
          className="absolute -translate-x-1/2 text-[10px] font-medium uppercase tracking-wide text-slate-400"
          style={{ left: `${t.leftPct}%` }}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}

/** A single phase block, proportionally placed and coloured by phase type. */
function PhaseBar({
  phase,
  plan,
  onClick,
}: {
  phase: YtpPhaseOut;
  plan: YearlyPlanOut;
  onClick?: (phase: YtpPhaseOut) => void;
}) {
  const meta = PHASE_META[phase.phase_type];
  const { leftPct, widthPct } = computeBarPosition(
    phase.start_date,
    phase.end_date,
    plan.start_date,
    plan.end_date
  );
  const weeks = weeksBetween(phase.start_date, phase.end_date);
  const title = `${phase.name} · ${meta.label} · ${phase.start_date} → ${phase.end_date} (${weeks}w)`;
  return (
    <button
      type="button"
      title={title}
      onClick={() => onClick?.(phase)}
      className={`absolute top-0 flex h-9 items-center overflow-hidden rounded px-2 text-left text-xs font-semibold shadow-sm transition hover:brightness-110 ${meta.bar}`}
      style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 1.5)}%` }}
    >
      {widthPct > 10 ? <span className="truncate">{phase.name}</span> : null}
    </button>
  );
}

/** A competition marker pinned at its date within the plan window. */
function CompetitionPin({
  comp,
  plan,
}: {
  comp: TimelineCompetition;
  plan: YearlyPlanOut;
}) {
  const at = computeMarkerPosition(comp.date, plan.start_date, plan.end_date);
  if (at === null) return null;
  return (
    <div
      className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
      style={{ left: `${at}%` }}
      title={`${comp.name} · ${comp.date}`}
    >
      <span className="h-12 w-px bg-rose-400" />
      <span className="mt-0.5 max-w-[80px] truncate text-[9px] font-medium text-rose-600">
        {comp.name}
      </span>
    </div>
  );
}

/** Full-width visual timeline for one plan: a month axis, proportional phase
 *  bars and competition pins, all positioned across the plan's date window. */
export function YtpTimeline({ plan, competitions = [], onPhaseClick }: Props) {
  return (
    <section
      aria-label="Season timeline"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{plan.title}</h3>
        <span className="text-xs text-slate-400">
          {plan.start_date} → {plan.end_date}
        </span>
      </div>
      <MonthAxis start={plan.start_date} end={plan.end_date} />
      <div className="relative h-16 rounded bg-slate-50">
        <div className="relative h-9">
          {plan.phases.map((p) => (
            <PhaseBar key={p.id} phase={p} plan={plan} onClick={onPhaseClick} />
          ))}
        </div>
        <div className="relative h-7">
          {competitions.map((c, i) => (
            <CompetitionPin key={`${c.name}-${i}`} comp={c} plan={plan} />
          ))}
        </div>
      </div>
      {plan.phases.length === 0 ? (
        <p className="mt-3 text-center text-xs text-slate-400">
          No phases yet — add one to build the season map.
        </p>
      ) : null}
    </section>
  );
}
