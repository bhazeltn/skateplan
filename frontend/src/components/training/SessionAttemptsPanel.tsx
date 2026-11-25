import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import {
  deleteSessionAttempt,
  listSessionAttempts,
  logSessionAttempts,
  type AttemptOut,
} from "@/lib/trainingApi";
import { ATTEMPT_OUTCOMES, outcomeLabel } from "@/lib/trainingHelpers";

interface Props {
  sessionId: string;
  onAttemptsChanged: () => void;
}

function AttemptRow({
  attempt,
  onDelete,
}: {
  attempt: AttemptOut;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-2 py-1.5 text-sm">
      <span className="w-14 shrink-0 font-mono font-semibold text-slate-900">
        {attempt.element_code}
      </span>
      <span className="flex-1 text-slate-600">{outcomeLabel(attempt.outcome)}</span>
      <span className="tabular-nums text-slate-500">×{attempt.attempts_count}</span>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label="delete attempt"
        onClick={onDelete}
      >
        ✕
      </Button>
    </li>
  );
}

/** Expanded attempt tracker for a single session. Lazy-loads attempts, offers a
 *  compact quick-add row, and lets the user remove attempts. Notifies the parent
 *  after any mutation so aggregate metrics refresh. */
export function SessionAttemptsPanel({ sessionId, onAttemptsChanged }: Props) {
  const { token } = useAuth();
  const [attempts, setAttempts] = useState<AttemptOut[]>([]);
  const [code, setCode] = useState("");
  const [outcome, setOutcome] = useState<string>("clean");
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    return listSessionAttempts(sessionId, token).then(setAttempts).catch(() => {});
  }, [sessionId, token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const add = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      await logSessionAttempts(
        sessionId,
        { element_code: code.trim(), outcome, attempts_count: count },
        token
      );
      setCode("");
      setCount(1);
      await reload();
      onAttemptsChanged();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (attemptId: string) => {
    if (!window.confirm("Delete this attempt?")) return;
    await deleteSessionAttempt(sessionId, attemptId, token);
    await reload();
    onAttemptsChanged();
  };

  return (
    <div
      data-testid="attempts-panel"
      className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3"
    >
      <div className="flex flex-wrap items-end gap-2">
        <Input
          className="w-28"
          placeholder="Element code..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <div className="flex flex-wrap gap-1">
          {ATTEMPT_OUTCOMES.map((o) => (
            <Button
              key={o}
              type="button"
              size="sm"
              variant={outcome === o ? "default" : "outline"}
              onClick={() => setOutcome(o)}
            >
              {outcomeLabel(o)}
            </Button>
          ))}
        </div>
        <Input
          type="number"
          min={1}
          className="w-16"
          aria-label="attempts count"
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        />
        <Button type="button" size="sm" disabled={busy} onClick={add}>
          + Add
        </Button>
      </div>

      {attempts.length === 0 ? (
        <p className="mt-3 text-center text-xs text-slate-400">No attempts logged.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-200">
          {attempts.map((a) => (
            <AttemptRow key={a.id} attempt={a} onDelete={() => remove(a.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}
