import { http, HttpResponse } from "msw";

// Stateful in-memory YTP store so plan/phase CRUD behaves realistically in tests
// (list reflects created/updated/deleted, phases nest, benchmark_ids persist).
// Reset between tests via resetYtpStore().
type Body = Record<string, unknown>;
interface Phase extends Body {
  id: string;
  plan_id: string;
  benchmark_ids: string[];
}
interface Plan extends Body {
  id: string;
  skater_id: number;
  start_date: string;
  phases: Phase[];
}

let plans: Plan[] = [];
let seq = 0;

export function resetYtpStore(): void {
  plans = [];
  seq = 0;
}

const str = (v: unknown): string | null => (v == null ? null : String(v));
const num = (v: unknown): number | null =>
  v == null || v === "" ? null : Number(v);

function buildPhase(planId: string, b: Body): Phase {
  return {
    id: `phase-${++seq}`,
    plan_id: planId,
    name: String(b.name ?? ""),
    phase_type: String(b.phase_type ?? "general_prep"),
    start_date: String(b.start_date ?? ""),
    end_date: String(b.end_date ?? ""),
    target_on_ice_hours_per_week: num(b.target_on_ice_hours_per_week),
    target_off_ice_hours_per_week: num(b.target_off_ice_hours_per_week),
    target_rpe: num(b.target_rpe),
    intensity_level: str(b.intensity_level),
    primary_focus: str(b.primary_focus),
    notes: str(b.notes),
    benchmark_ids: (b.benchmark_ids as string[]) ?? [],
  };
}

const sortedPlan = (plan: Plan): Plan => ({
  ...plan,
  phases: [...plan.phases].sort((a, b) =>
    String(a.start_date).localeCompare(String(b.start_date))
  ),
});

function findPhase(id: string): Phase | undefined {
  return plans.flatMap((p) => p.phases).find((x) => x.id === id);
}

export const ytpHandlers = [
  http.get("*/api/skaters/:skaterId/ytp", ({ params }) => {
    const sid = Number(params.skaterId);
    const rows = plans
      .filter((p) => p.skater_id === sid)
      .sort((a, b) => b.start_date.localeCompare(a.start_date))
      .map(sortedPlan);
    return HttpResponse.json(rows);
  }),
  http.post("*/api/skaters/:skaterId/ytp", async ({ request, params }) => {
    const b = (await request.json()) as Body;
    const plan: Plan = {
      id: `plan-${++seq}`,
      skater_id: Number(params.skaterId),
      season_label: String(b.season_label ?? ""),
      title: String(b.title ?? ""),
      start_date: String(b.start_date ?? ""),
      end_date: String(b.end_date ?? ""),
      primary_goal: str(b.primary_goal),
      notes: str(b.notes),
      created_at: new Date().toISOString(),
      phases: [],
    };
    plans.push(plan);
    return HttpResponse.json(sortedPlan(plan), { status: 201 });
  }),
  http.patch("*/api/ytp/plans/:planId", async ({ request, params }) => {
    const b = (await request.json()) as Body;
    const plan = plans.find((p) => p.id === params.planId);
    if (!plan) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    for (const k of Object.keys(b)) plan[k] = b[k];
    return HttpResponse.json(sortedPlan(plan));
  }),
  http.delete("*/api/ytp/plans/:planId", ({ params }) => {
    plans = plans.filter((p) => p.id !== params.planId);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post("*/api/ytp/plans/:planId/phases", async ({ request, params }) => {
    const plan = plans.find((p) => p.id === params.planId);
    if (!plan) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const phase = buildPhase(plan.id, (await request.json()) as Body);
    plan.phases.push(phase);
    return HttpResponse.json(phase, { status: 201 });
  }),
  http.patch("*/api/ytp/phases/:phaseId", async ({ request, params }) => {
    const phase = findPhase(String(params.phaseId));
    if (!phase) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const b = (await request.json()) as Body;
    for (const k of Object.keys(b)) phase[k] = b[k];
    return HttpResponse.json(phase);
  }),
  http.delete("*/api/ytp/phases/:phaseId", ({ params }) => {
    for (const p of plans) p.phases = p.phases.filter((x) => x.id !== params.phaseId);
    return new HttpResponse(null, { status: 204 });
  }),
];
