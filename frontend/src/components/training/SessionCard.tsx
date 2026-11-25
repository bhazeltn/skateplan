import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionOut } from "@/lib/trainingApi";
import type { SkaterProgram } from "@/lib/types";
import { sessionTypeLabel } from "@/lib/trainingHelpers";
import { SessionAttemptsPanel } from "./SessionAttemptsPanel";
import { SessionRunThroughsPanel } from "./SessionRunThroughsPanel";

interface Props {
  session: SessionOut;
  programs: SkaterProgram[];
  onEdit: () => void;
  onDelete: () => void;
  onAttemptsChanged: () => void;
  onRunThroughsChanged: () => void;
}

function SessionMeta({ session }: { session: SessionOut }) {
  const isOnIce = session.session_type !== "off_ice";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={isOnIce ? "primary" : "default"}>
        {sessionTypeLabel(session.session_type)}
      </Badge>
      <span className="text-sm font-semibold text-slate-900">
        {session.duration_minutes} min
      </span>
      <Badge variant="warning">Effort {session.rpe}/10</Badge>
      {session.location ? (
        <span className="text-xs text-slate-500">· {session.location}</span>
      ) : null}
    </div>
  );
}

/** One logged training session: date, type, duration and effort, with inline
 *  actions to edit, delete (confirm-guarded) and expand its attempts tracker. */
export function SessionCard({
  session,
  programs,
  onEdit,
  onDelete,
  onAttemptsChanged,
  onRunThroughsChanged,
}: Props) {
  const [showAttempts, setShowAttempts] = useState(false);
  const [showRunThroughs, setShowRunThroughs] = useState(false);

  const confirmDelete = () => {
    if (window.confirm("Delete this session and its attempts?")) onDelete();
  };

  return (
    <article
      data-testid="session-card"
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">
            {session.session_date ?? "No date"}
          </p>
          <SessionMeta session={session} />
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            size="sm"
            variant={showAttempts ? "default" : "outline"}
            onClick={() => setShowAttempts((v) => !v)}
          >
            Attempts
          </Button>
          <Button
            type="button"
            size="sm"
            variant={showRunThroughs ? "default" : "outline"}
            onClick={() => setShowRunThroughs((v) => !v)}
          >
            Run-Throughs
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-rose-600 hover:bg-rose-50"
            onClick={confirmDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      {session.notes ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
          {session.notes}
        </p>
      ) : null}

      {showAttempts ? (
        <SessionAttemptsPanel
          sessionId={session.id}
          onAttemptsChanged={onAttemptsChanged}
        />
      ) : null}

      {showRunThroughs ? (
        <SessionRunThroughsPanel
          sessionId={session.id}
          programs={programs}
          onRunThroughsChanged={onRunThroughsChanged}
        />
      ) : null}
    </article>
  );
}
