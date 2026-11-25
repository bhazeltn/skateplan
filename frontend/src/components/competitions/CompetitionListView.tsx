import { partitionCompetitions } from "@/lib/calendarHelpers";
import type { RosterCompetitionOut } from "@/lib/competitionScheduleApi";
import { CompetitionScheduleCard } from "./CompetitionScheduleCard";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function Section({
  title,
  items,
  muted = false,
}: {
  title: string;
  items: RosterCompetitionOut[];
  muted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className={muted ? "opacity-70" : undefined}>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map((c) => (
          <CompetitionScheduleCard key={c.id} competition={c} />
        ))}
      </div>
    </section>
  );
}

/** List view: upcoming (expanded), past (muted) and undated competition groups. */
export function CompetitionListView({
  competitions,
  todayIso = todayStr(),
}: {
  competitions: RosterCompetitionOut[];
  todayIso?: string;
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
      <Section title="Upcoming Competitions" items={upcoming} />
      <Section title="Past Competitions" items={past} muted />
      <Section title="Undated" items={undated} />
    </div>
  );
}
