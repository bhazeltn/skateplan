import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useYtp } from "@/components/ytp/useYtp";
import type {
  SessionCreate,
  SessionOut,
  SessionUpdate,
} from "@/lib/trainingApi";
import { findActivePhase, sortSessionsNewestFirst } from "@/lib/trainingHelpers";
import { ElementConsistencyCard } from "./ElementConsistencyCard";
import { SessionCard } from "./SessionCard";
import { SessionModal } from "./SessionModal";
import { useTrainingLogs } from "./useTrainingLogs";
import { WeeklyLoadBar } from "./WeeklyLoadBar";

type Filter = "all" | "on_ice" | "off_ice";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "on_ice", label: "On-Ice" },
  { value: "off_ice", label: "Off-Ice" },
];

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Training tab for a skater profile: log training sessions, track per-attempt
 *  outcomes, and compare this week's load against the active YTP phase targets. */
export function TrainingTab({ skaterId }: { skaterId: number | string }) {
  const logs = useTrainingLogs(skaterId);
  const { plans } = useYtp(skaterId);
  const [filter, setFilter] = useState<Filter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SessionOut | null>(null);

  const activePhase = useMemo(
    () => findActivePhase(plans, todayIso()),
    [plans]
  );

  const visible = useMemo(() => {
    const rows = sortSessionsNewestFirst(logs.sessions);
    const isOn = (s: SessionOut) => s.session_type !== "off_ice";
    if (filter === "all") return rows;
    if (filter === "on_ice") return rows.filter(isOn);
    return rows.filter((s) => s.session_type === "off_ice");
  }, [logs.sessions, filter]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (s: SessionOut) => {
    setEditing(s);
    setModalOpen(true);
  };

  const handleSubmit = async (payload: SessionCreate | SessionUpdate) => {
    if (editing) await logs.editSession(editing.id, payload as SessionUpdate);
    else await logs.addSession(payload as SessionCreate);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter sessions">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              type="button"
              size="sm"
              variant={filter === f.value ? "default" : "outline"}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button type="button" onClick={openCreate}>
          + Log Session
        </Button>
      </div>

      {logs.error ? <Alert variant="danger">{logs.error}</Alert> : null}

      <WeeklyLoadBar sessions={logs.sessions} activePhase={activePhase} />
      <ElementConsistencyCard stats={logs.metrics.element_stats} />

      {logs.sessions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
          No training sessions logged yet. Click “+ Log Session” to start.
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              onEdit={() => openEdit(s)}
              onDelete={() => void logs.removeSession(s.id)}
              onAttemptsChanged={logs.refresh}
            />
          ))}
        </div>
      )}

      {modalOpen ? (
        <SessionModal
          skaterId={skaterId}
          initial={editing ?? undefined}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  );
}
