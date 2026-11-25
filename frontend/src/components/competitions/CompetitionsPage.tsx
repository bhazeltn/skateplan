import { useState } from "react";
import { cn } from "@/lib/utils";
import { CompetitionListView } from "./CompetitionListView";
import { CompetitionCalendarView } from "./CompetitionCalendarView";
import { useRosterSchedule } from "./useRosterSchedule";

type ViewMode = "list" | "calendar";

function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  const opts: ViewMode[] = ["list", "calendar"];
  return (
    <div className="inline-flex rounded-md border border-slate-200 p-0.5" role="group" aria-label="View mode">
      {opts.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "rounded px-3 py-1 text-sm font-medium capitalize",
            mode === m ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

function SkaterFilter({
  value,
  options,
  onChange,
}: {
  value: number | null;
  options: { id: number; name: string }[];
  onChange: (id: number | null) => void;
}) {
  return (
    <select
      aria-label="Skater Filter"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
    >
      <option value="">All Skaters</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

/** Competitions page: list/calendar toggle + skater filter over the roster schedule. */
export function CompetitionsPage({ today }: { today?: string }) {
  const [mode, setMode] = useState<ViewMode>("list");
  const {
    skaterOptions,
    selectedSkaterId,
    setSelectedSkaterId,
    filteredCompetitions,
    loading,
    error,
  } = useRosterSchedule();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Competitions</h1>
        <div className="flex flex-wrap items-center gap-3">
          <ViewToggle mode={mode} onChange={setMode} />
          <SkaterFilter
            value={selectedSkaterId}
            options={skaterOptions}
            onChange={setSelectedSkaterId}
          />
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-slate-500">Loading competitions…</p>
      ) : mode === "list" ? (
        <CompetitionListView competitions={filteredCompetitions} todayIso={today} />
      ) : (
        <CompetitionCalendarView competitions={filteredCompetitions} todayIso={today} />
      )}
    </div>
  );
}
