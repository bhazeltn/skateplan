import { http, HttpResponse } from "msw";

// Stateful in-memory training store so session + attempt CRUD and the derived
// metrics behave realistically in tests. Reset between tests via
// resetTrainingStore(). Metrics mirror backend training_service.py:
//  total_ice_minutes = sum(duration) over ALL session types,
//  workload_index = sum(duration * rpe), average_rpe = round(mean, 2),
//  element_stats grouped by element_code with clean_count where outcome==="clean".
type Body = Record<string, unknown>;
interface Session extends Body {
  id: string;
  skater_id: number;
  session_date: string | null;
}
interface Attempt extends Body {
  id: string;
  session_id: string;
  element_code: string;
  outcome: string;
  attempts_count: number;
  tags: string[];
}

// Two-tier bucket mirroring backend: clean = outcome "clean" with no tags;
// with_calls = outcome "clean" with >=1 tag. Weighted by attempts_count.
interface Bucket {
  total: number;
  clean: number;
  withCalls: number;
  tags: Record<string, number>;
}

const pct = (part: number, whole: number): number =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0;

const tagsOf = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

function addToBucket(b: Bucket, outcome: string, tags: string[], weight: number): void {
  b.total += weight;
  const clean = outcome === "clean";
  if (clean && tags.length === 0) b.clean += weight;
  if (clean && tags.length > 0) b.withCalls += weight;
  for (const t of tags) b.tags[t] = (b.tags[t] ?? 0) + weight;
}

/** Deterministic order: count DESC, tie-break tag name ASC. */
function orderTagCounts(tags: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(tags).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  ))
    out[k] = v;
  return out;
}

function statFromBucket(code: string, b: Bucket) {
  return {
    element_code: code,
    total_attempts: b.total,
    clean_count: b.clean,
    clean_percentage: pct(b.clean, b.total),
    with_calls_count: b.withCalls,
    completed_percentage: pct(b.clean + b.withCalls, b.total),
    tag_counts: orderTagCounts(b.tags),
  };
}

let sessions: Session[] = [];
let attempts: Attempt[] = [];
let seq = 0;

export function resetTrainingStore(): void {
  sessions = [];
  attempts = [];
  seq = 0;
}

/** Session lookup for cross-module mocks (run-throughs resolve skater/date). */
export function findMockSession(id: string): Session | undefined {
  return sessions.find((s) => s.id === id);
}

const str = (v: unknown): string | null => (v == null ? null : String(v));

function buildSession(skaterId: number, b: Body): Session {
  return {
    id: `session-${++seq}`,
    skater_id: skaterId,
    logged_by_user_id: 10,
    session_date: str(b.session_date),
    session_type: String(b.session_type ?? "on_ice"),
    duration_minutes: Number(b.duration_minutes ?? 0),
    rpe: Number(b.rpe ?? 1),
    location: str(b.location),
    notes: str(b.notes),
  };
}

function buildAttempt(sessionId: string, b: Body): Attempt {
  return {
    id: `attempt-${++seq}`,
    session_id: sessionId,
    element_code: String(b.element_code ?? ""),
    outcome: String(b.outcome ?? "clean"),
    attempts_count: Number(b.attempts_count ?? 1),
    notes: str(b.notes),
    tags: tagsOf(b.tags),
  };
}

function computeMetrics(skaterId: number, url: URL): Body {
  const start = url.searchParams.get("start_date");
  const end = url.searchParams.get("end_date");
  const rows = sessions.filter(
    (s) =>
      s.skater_id === skaterId &&
      (!start || (s.session_date ?? "") >= start) &&
      (!end || (s.session_date ?? "") <= end)
  );
  const ids = new Set(rows.map((s) => s.id));
  const totalMin = rows.reduce((t, s) => t + Number(s.duration_minutes), 0);
  const workload = rows.reduce((t, s) => t + Number(s.duration_minutes) * Number(s.rpe), 0);
  const rpeSum = rows.reduce((t, s) => t + Number(s.rpe), 0);
  const buckets: Record<string, Bucket> = {};
  for (const a of attempts.filter((x) => ids.has(x.session_id))) {
    const b = (buckets[a.element_code] ??= { total: 0, clean: 0, withCalls: 0, tags: {} });
    addToBucket(b, a.outcome, tagsOf(a.tags), a.attempts_count);
  }
  const element_stats = Object.keys(buckets)
    .sort()
    .map((code) => statFromBucket(code, buckets[code]));
  return {
    skater_id: skaterId,
    total_ice_minutes: totalMin,
    session_count: rows.length,
    workload_index: workload,
    average_rpe: rows.length ? Math.round((rpeSum / rows.length) * 100) / 100 : 0,
    element_stats,
  };
}

export const trainingHandlers = [
  http.get("*/api/skaters/:skaterId/sessions", ({ params, request }) => {
    const sid = Number(params.skaterId);
    const url = new URL(request.url);
    const type = url.searchParams.get("session_type");
    const start = url.searchParams.get("start_date");
    const end = url.searchParams.get("end_date");
    const rows = sessions
      .filter((s) => s.skater_id === sid)
      .filter((s) => !type || s.session_type === type)
      .filter((s) => !start || (s.session_date ?? "") >= start)
      .filter((s) => !end || (s.session_date ?? "") <= end)
      .sort((a, b) => (a.session_date ?? "").localeCompare(b.session_date ?? ""));
    return HttpResponse.json(rows);
  }),
  http.get("*/api/skaters/:skaterId/training/metrics", ({ params, request }) =>
    HttpResponse.json(computeMetrics(Number(params.skaterId), new URL(request.url)))
  ),
  http.post("*/api/sessions", async ({ request }) => {
    const b = (await request.json()) as Body;
    const session = buildSession(Number(b.skater_id), b);
    sessions.push(session);
    return HttpResponse.json(session, { status: 201 });
  }),
  http.patch("*/api/sessions/:id", async ({ request, params }) => {
    const s = sessions.find((x) => x.id === params.id);
    if (!s) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const b = (await request.json()) as Body;
    for (const k of Object.keys(b)) s[k] = b[k];
    return HttpResponse.json(s);
  }),
  http.delete("*/api/sessions/:id", ({ params }) => {
    sessions = sessions.filter((s) => s.id !== params.id);
    attempts = attempts.filter((a) => a.session_id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get("*/api/sessions/:id/attempts", ({ params }) =>
    HttpResponse.json(attempts.filter((a) => a.session_id === params.id))
  ),
  http.post("*/api/sessions/:id/attempts", async ({ request, params }) => {
    const body = (await request.json()) as Body | Body[];
    const items = Array.isArray(body) ? body : [body];
    const created = items.map((b) => buildAttempt(String(params.id), b));
    attempts.push(...created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch("*/api/sessions/:sid/attempts/:aid", async ({ request, params }) => {
    const a = attempts.find((x) => x.id === params.aid);
    if (!a) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const b = (await request.json()) as Body;
    for (const k of Object.keys(b)) a[k] = b[k];
    return HttpResponse.json(a);
  }),
  http.delete("*/api/sessions/:sid/attempts/:aid", ({ params }) => {
    attempts = attempts.filter((a) => a.id !== params.aid);
    return new HttpResponse(null, { status: 204 });
  }),
];
