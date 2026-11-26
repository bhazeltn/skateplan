import { http, HttpResponse } from "msw";
import type {
  CoachAccessOut,
  PendingInviteOut,
  SkaterCapabilities,
} from "@/lib/accessApi";
import type { GoalOut } from "@/lib/goalsApi";

// Stateful in-memory access/invite/goals store so capability-gated views and the
// invite lifecycle behave realistically. Reset between tests via
// resetAccessStore(); seed with the exported helpers. Defaults = full primary
// coach access so existing profile tests keep rendering every control.
const FULL_COACH: SkaterCapabilities = {
  role: "primary",
  can_edit_plan: true,
  can_edit_goals: true,
  can_log_training: true,
  can_manage_access: true,
};

interface StoredInvite extends PendingInviteOut {
  token: string;
}
interface PublicInvite {
  email: string;
  target_role: string;
  skater_name: string | null;
  expires_at: string;
  gone: boolean;
}

let capabilities: SkaterCapabilities = { ...FULL_COACH };
let coaches: CoachAccessOut[] = [];
let invites: StoredInvite[] = [];
let publicInvites: Record<string, PublicInvite> = {};
let goals: GoalOut[] = [];
let seq = 0;

export function resetAccessStore(): void {
  capabilities = { ...FULL_COACH };
  coaches = [];
  invites = [];
  publicInvites = {};
  goals = [];
  seq = 0;
}

export function setMockCapabilities(caps: Partial<SkaterCapabilities>): void {
  capabilities = { ...capabilities, ...caps };
}

export function seedCoaches(rows: CoachAccessOut[]): void {
  coaches = [...rows];
}

export function seedInvites(rows: StoredInvite[]): void {
  invites = [...rows];
}

export function seedGoals(rows: GoalOut[]): void {
  goals = [...rows];
}

export function seedPublicInvite(token: string, data: Partial<PublicInvite>): void {
  publicInvites[token] = {
    email: data.email ?? "invitee@example.com",
    target_role: data.target_role ?? "skater",
    skater_name: data.skater_name ?? null,
    expires_at: data.expires_at ?? "2099-01-01T00:00:00Z",
    gone: data.gone ?? false,
  };
}

function fakeJwt(userId: number, role: string): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ user_id: userId, system_role: role }));
  return `${header}.${payload}.sig`;
}

const mgmt = [
  http.get("*/api/skaters/:id/access/me", () => HttpResponse.json(capabilities)),
  http.get("*/api/skaters/:id/access", () =>
    HttpResponse.json({
      coaches,
      pending_invites: invites.map(({ token: _t, ...rest }) => rest),
    })
  ),
  http.post("*/api/skaters/:id/access/invites", async ({ request }) => {
    const body = (await request.json()) as { email: string; role: string };
    const token = `tok_${++seq}`;
    const invite: StoredInvite = {
      token,
      invite_id: `inv_${seq}`,
      email: body.email,
      target_role: body.role,
      expires_at: "2099-01-01T00:00:00Z",
      accepted_at: null,
    };
    invites.push(invite);
    return HttpResponse.json(
      {
        status: "invited",
        invite_id: invite.invite_id,
        token,
        invite_path: `/accept-invite?token=${token}`,
      },
      { status: 201 }
    );
  }),
  http.patch("*/api/skaters/:id/access/coaches/:coachId", async ({ request, params }) => {
    const body = (await request.json()) as { role: string };
    const cid = Number(params.coachId);
    coaches = coaches.map((c) =>
      c.coach_user_id === cid ? { ...c, permission_level: body.role } : c
    );
    return HttpResponse.json(coaches.find((c) => c.coach_user_id === cid));
  }),
  http.delete("*/api/skaters/:id/access/coaches/:coachId", ({ params }) => {
    coaches = coaches.filter((c) => c.coach_user_id !== Number(params.coachId));
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete("*/api/skaters/:id/access/invites/:inviteId", ({ params }) => {
    invites = invites.filter((i) => i.invite_id !== params.inviteId);
    return new HttpResponse(null, { status: 204 });
  }),
];

const auth = [
  http.get("*/api/auth/invites/:token", ({ params }) => {
    const rec = publicInvites[String(params.token)];
    if (!rec) return new HttpResponse(null, { status: 404 });
    if (rec.gone) return new HttpResponse(null, { status: 410 });
    const { gone: _g, ...out } = rec;
    return HttpResponse.json(out);
  }),
  http.post("*/api/auth/accept-invite", () =>
    HttpResponse.json({
      access_token: fakeJwt(42, "athlete"),
      token_type: "bearer",
      user_id: 42,
      role: "athlete",
    })
  ),
  http.post("*/api/auth/change-password", () =>
    HttpResponse.json({ status: "password_changed" })
  ),
];

const goal = [
  http.get("*/api/skaters/:id/goals", () => HttpResponse.json(goals)),
  http.post("*/api/skaters/:id/goals", async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const now = new Date().toISOString();
    const rec: GoalOut = {
      id: `goal_${++seq}`,
      skater_id: Number(params.id),
      title: String(body.title ?? ""),
      detail: (body.detail as string) ?? null,
      status: String(body.status ?? "open"),
      created_at: now,
      updated_at: now,
    };
    goals.push(rec);
    return HttpResponse.json(rec, { status: 201 });
  }),
  http.patch("*/api/skaters/:id/goals/:goalId", async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    goals = goals.map((g) => (g.id === params.goalId ? { ...g, ...body } : g));
    return HttpResponse.json(goals.find((g) => g.id === params.goalId));
  }),
  http.delete("*/api/skaters/:id/goals/:goalId", ({ params }) => {
    goals = goals.filter((g) => g.id !== params.goalId);
    return new HttpResponse(null, { status: 204 });
  }),
];

export const accessHandlers = [...mgmt, ...auth, ...goal];
