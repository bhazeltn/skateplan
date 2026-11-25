import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildMonthGrid, competitionsOnDate } from "@/lib/calendarHelpers";
import type { RosterCompetitionOut } from "@/lib/competitionScheduleApi";
import { CompetitionScheduleCard } from "./CompetitionScheduleCard";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function MonthNav(props: {
  label: string;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Button variant="ghost" size="sm" onClick={props.onPrev} aria-label="Previous month">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Prev
      </Button>
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-slate-900">{props.label}</span>
        <Button variant="ghost" size="sm" onClick={props.onToday}>Today</Button>
      </div>
      <Button variant="ghost" size="sm" onClick={props.onNext} aria-label="Next month">
        Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

function Chip({
  comp,
  onSelect,
}: {
  comp: RosterCompetitionOut;
  onSelect: (id: string) => void;
}) {
  const n = comp.entries.length;
  return (
    <button
      type="button"
      onClick={() => onSelect(comp.id)}
      className="w-full truncate rounded bg-blue-50 px-1 py-0.5 text-left text-[11px] font-medium text-blue-700 hover:bg-blue-100"
    >
      <span className="block truncate">{comp.name}</span>
      <span className="text-[10px] text-blue-500">
        {n} skater{n === 1 ? "" : "s"}
      </span>
    </button>
  );
}

function DayCellView(props: {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  comps: RosterCompetitionOut[];
  onSelect: (id: string) => void;
}) {
  return (
    <div
      aria-current={props.isToday ? "date" : undefined}
      className={[
        "min-h-16 space-y-0.5 border border-slate-100 p-1 align-top",
        props.inMonth ? "bg-white" : "bg-slate-50 text-slate-400",
        props.isToday ? "ring-2 ring-inset ring-blue-400" : "",
      ].join(" ")}
    >
      <div className="text-right text-[11px]">{props.day}</div>
      {props.comps.map((c) => (
        <Chip key={c.id} comp={c} onSelect={props.onSelect} />
      ))}
    </div>
  );
}

/** Month calendar: nav bar, Sun–Sat grid with competition chips, detail panel. */
export function CompetitionCalendarView({
  competitions,
  todayIso = todayStr(),
}: {
  competitions: RosterCompetitionOut[];
  todayIso?: string;
}) {
  const [y, mi] = todayIso.split("-").map(Number);
  const [cursor, setCursor] = useState({ year: y, month: mi - 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const cells = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor]
  );
  const shift = (delta: number) => {
    const d = new Date(Date.UTC(cursor.year, cursor.month + delta, 1));
    setCursor({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  };
  const selected = competitions.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <MonthNav
        label={`${MONTH_NAMES[cursor.month]} ${cursor.year}`}
        onPrev={() => shift(-1)}
        onToday={() => setCursor({ year: y, month: mi - 1 })}
        onNext={() => shift(1)}
      />
      <div className="grid grid-cols-7 gap-px rounded-md bg-slate-200 p-px">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-slate-50 py-1 text-center text-[11px] font-semibold text-slate-600">
            {w}
          </div>
        ))}
        {cells.map((cell) => (
          <DayCellView
            key={cell.iso}
            iso={cell.iso}
            day={cell.day}
            inMonth={cell.inMonth}
            isToday={cell.iso === todayIso}
            comps={competitionsOnDate(competitions, cell.iso)}
            onSelect={setSelectedId}
          />
        ))}
      </div>
      {selected && <CompetitionScheduleCard competition={selected} />}
    </div>
  );
}
