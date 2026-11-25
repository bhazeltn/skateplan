import { partitionCompetitions } from "@/lib/calendarHelpers";
import type { RosterCompetitionOut } from "@/lib/competitionScheduleApi";
import { CompetitionScheduleCard } from "./CompetitionScheduleCard";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

type EditHandler = (comp: RosterCompetitionOut) => void;

function Section({
  title,
  items,
  muted = false,
  onEdit,
}: {
  title: string;
  items: RosterCompetitionOut[];
  muted?: boolean;
  onEdit?: EditHandler;
}) {
  if (items.length === 0) return null;
  return (
    <section className={muted ? "opacity-70" : undefined}>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map((c) => (
          <CompetitionScheduleCard key={c.id} competition={c} onEdit={onEdit} />
        ))}
      </div>
    </section>
  );
}

/** List view: upcoming (expanded), past (muted) and undated competition groups. */
export function CompetitionListView({
  competitions,
  todayIso = todayStr(),
  onEdit,
}: {
  competitions: RosterCompetitionOut[];
  todayIso?: string;
  onEdit?: EditHandler;
}) {
  const { upcoming, past, undated } = partitionCompetitions(competitions, todayIso);

  if (competitions.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
        No competitions match the current filter.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <Section title="Upcoming Competitions" items={upcoming} onEdit={onEdit} />
      <Section title="Past Competitions" items={past} muted onEdit={onEdit} />
      <Section title="Undated" items={undated} onEdit={onEdit} />
    </div>
  );
}
