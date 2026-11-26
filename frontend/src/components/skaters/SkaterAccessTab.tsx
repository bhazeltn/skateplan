import { InviteAccessForm } from "@/components/skaters/InviteAccessForm";
import { useSkaterAccess } from "@/components/skaters/useSkaterAccess";
import type {
  CoachAccessOut,
  InviteResponse,
  PendingInviteOut,
} from "@/lib/accessApi";

const SELECT =
  "rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700";

function coachName(c: CoachAccessOut): string {
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email;
}

/** Primary-coach-only tab: manage co-coach roles and skater/coach invitations. */
export function SkaterAccessTab({ skaterId }: { skaterId: number | string }) {
  const { summary, loading, invite, setRole, remove, revoke } =
    useSkaterAccess(skaterId);
  const pendingSkater = summary.pending_invites.some(
    (i) => i.target_role === "skater"
  );

  function onInvited(_res: InviteResponse) {
    /* list refresh handled by the hook */
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading access…</p>;
  }

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Access & invites</h3>
        <p className="text-xs text-slate-500">
          Skater login:{" "}
          <span className="font-medium text-slate-700">
            {pendingSkater ? "Invite pending — not logged in yet" : "Active"}
          </span>
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Coaches ({summary.coaches.length})
        </h4>
        {summary.coaches.length === 0 ? (
          <p className="text-xs text-slate-400">No co-coaches yet.</p>
        ) : (
          <ul className="space-y-2">
            {summary.coaches.map((c) => (
              <CoachRow
                key={c.coach_user_id}
                coach={c}
                onRole={setRole}
                onRemove={remove}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Pending invites ({summary.pending_invites.length})
        </h4>
        {summary.pending_invites.length === 0 ? (
          <p className="text-xs text-slate-400">No pending invites.</p>
        ) : (
          <ul className="space-y-2">
            {summary.pending_invites.map((i) => (
              <InviteRow key={i.invite_id} invite={i} onRevoke={revoke} />
            ))}
          </ul>
        )}
      </div>

      <InviteAccessForm onInvite={invite} onInvited={onInvited} />
    </section>
  );
}

function CoachRow({
  coach,
  onRole,
  onRemove,
}: {
  coach: CoachAccessOut;
  onRole: (id: number, role: string) => void;
  onRemove: (id: number) => void;
}) {
  const isPrimary = coach.permission_level === "primary";
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">
          {coachName(coach)}
        </p>
        <p className="truncate text-xs text-slate-500">{coach.email}</p>
      </div>
      {isPrimary ? (
        <span className="text-xs font-semibold text-slate-600">Primary</span>
      ) : (
        <div className="flex items-center gap-2">
          <select
            aria-label={`Role for ${coachName(coach)}`}
            value={coach.permission_level}
            onChange={(e) => onRole(coach.coach_user_id, e.target.value)}
            className={SELECT}
          >
            <option value="collaborator">Collaborator</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            type="button"
            onClick={() => onRemove(coach.coach_user_id)}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            Remove
          </button>
        </div>
      )}
    </li>
  );
}

function InviteRow({
  invite,
  onRevoke,
}: {
  invite: PendingInviteOut;
  onRevoke: (id: string) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-900">{invite.email}</p>
        <p className="text-xs text-slate-500">{invite.target_role}</p>
      </div>
      <button
        type="button"
        onClick={() => onRevoke(invite.invite_id)}
        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
      >
        Revoke
      </button>
    </li>
  );
}
