import { http, HttpResponse } from "msw";
import { findMockSession } from "@/mocks/trainingHandlers";

// Stateful in-memory run-through store; CRUD + derived program-stats aggregation
// mirror backend run_through_service.py. Reset via resetRunThroughStore().
type Body = Record<string, unknown>;
interface ElementResult {
  id: string; element_order: number; element_code: string;
  outcome: string; notes: string | null; tags: string[];
}
interface RunThrough {
  id: string; session_id: string; program_id: string; program_name: string;
  program_segment: string; run_type: string; with_music: boolean;
  notes: string | null; created_at: string; element_results: ElementResult[];
  skater_id: number; session_date: string | null;
}

let runs: RunThrough[] = [];
let catalog: Record<string, { name: string; segment: string }> = {};
let seq = 0;

export function resetRunThroughStore(): void {
  runs = []; catalog = {}; seq = 0;
}

/** Register program name/segment so POST can stamp run-throughs realistically. */
export function seedRunThroughPrograms(
  list: { id: string; name: string; segment: string }[]
): void {
  for (const p of list) catalog[p.id] = { name: p.name, segment: p.segment };
}

const str = (v: unknown): string | null => (v == null ? null : String(v));
const pct = (part: number, whole: number): number =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0;
const tagsOf = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

/** Deterministic order: count DESC, tie-break tag name ASC. */
function orderTagCounts(tags: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(tags).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  ))
    out[k] = v;
  return out;
}

function buildElements(list: Body[]): ElementResult[] {
  return list
    .map((e, i) => ({
      id: `rte-${++seq}`,
      element_order: e.element_order != null ? Number(e.element_order) : i,
      element_code: String(e.element_code ?? ""),
      outcome: String(e.outcome ?? "clean"), notes: str(e.notes),
      tags: tagsOf(e.tags),
    }))
    .sort((a, b) => a.element_order - b.element_order);
}

function serialize(r: RunThrough) {
  const { skater_id: _s, session_date: _d, ...pub } = r;
  return pub;
}

interface EBucket {
  total: number; clean: number; withCalls: number; tags: Record<string, number>;
}
interface Group {
  program_id: string; program_name: string; segment: string;
  total_runs: number; full_runs: number; clean_runs: number;
  elements: Record<string, EBucket>;
  totalEl: number; cleanEl: number; completedEl: number;
}

/** Fold one element; returns true iff it is a true clean (outcome clean, no tags). */
function tallyElement(g: Group, e: ElementResult): boolean {
  const b = (g.elements[e.element_code] ??= { total: 0, clean: 0, withCalls: 0, tags: {} });
  b.total += 1;
  g.totalEl += 1;
  for (const t of e.tags) b.tags[t] = (b.tags[t] ?? 0) + 1;
  if (e.outcome !== "clean") return false;
  g.completedEl += 1;
  if (e.tags.length > 0) {
    b.withCalls += 1;
    return false;
  }
  b.clean += 1;
  g.cleanEl += 1;
  return true;
}

function tally(g: Group, r: RunThrough): void {
  g.total_runs += 1;
  if (r.run_type === "full") g.full_runs += 1;
  let allClean = r.element_results.length > 0;
  for (const e of r.element_results) if (!tallyElement(g, e)) allClean = false;
  if (allClean) g.clean_runs += 1;
}

function elementStat(code: string, b: EBucket) {
  return {
    element_code: code, total_attempts: b.total, clean_count: b.clean,
    clean_percentage: pct(b.clean, b.total), with_calls_count: b.withCalls,
    completed_percentage: pct(b.clean + b.withCalls, b.total),
    tag_counts: orderTagCounts(b.tags),
  };
}

function finalize(g: Group) {
  const element_stats = Object.keys(g.elements)
    .map((code) => elementStat(code, g.elements[code]))
    .sort((a, b) => b.total_attempts - a.total_attempts);
  return {
    program_id: g.program_id, program_name: g.program_name, segment: g.segment,
    total_runs: g.total_runs, full_runs: g.full_runs, clean_runs: g.clean_runs,
    overall_clean_percentage: pct(g.cleanEl, g.totalEl),
    overall_completed_percentage: pct(g.completedEl, g.totalEl), element_stats,
  };
}

function aggregate(skaterId: number, url: URL) {
  const sp = url.searchParams;
  const start = sp.get("start_date"), end = sp.get("end_date");
  const pid = sp.get("program_id");
  const groups: Record<string, Group> = {};
  for (const r of runs) {
    const d = r.session_date ?? "";
    if (r.skater_id !== skaterId) continue;
    if ((start && d < start) || (end && d > end)) continue;
    if (pid && r.program_id !== pid) continue;
    const g = (groups[r.program_id] ??= {
      program_id: r.program_id, program_name: r.program_name, segment: r.program_segment,
      total_runs: 0, full_runs: 0, clean_runs: 0, elements: {},
      totalEl: 0, cleanEl: 0, completedEl: 0,
    });
    tally(g, r);
  }
  return Object.values(groups).map(finalize);
}

function createRun(sid: string, b: Body): RunThrough {
  const sess = findMockSession(sid);
  const pid = String(b.program_id);
  const info = catalog[pid] ?? { name: pid, segment: "SP" };
  return {
    id: `run-${++seq}`, session_id: sid, program_id: pid,
    program_name: info.name, program_segment: info.segment,
    run_type: String(b.run_type ?? "full"), with_music: b.with_music !== false,
    notes: str(b.notes), created_at: new Date(Date.now() + seq).toISOString(),
    element_results: buildElements((b.element_results as Body[]) ?? []),
    skater_id: sess ? Number(sess.skater_id) : 0,
    session_date: (sess?.session_date as string | null) ?? null,
  };
}

export const runThroughHandlers = [
  http.get("*/api/sessions/:sessionId/run-throughs", ({ params }) =>
    HttpResponse.json(runs.filter((r) => r.session_id === params.sessionId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at)).map(serialize))
  ),
  http.post("*/api/sessions/:sessionId/run-throughs", async ({ request, params }) => {
    const run = createRun(String(params.sessionId), (await request.json()) as Body);
    runs.push(run);
    return HttpResponse.json(serialize(run), { status: 201 });
  }),
  http.patch("*/api/sessions/:sid/run-throughs/:rid", async ({ request, params }) => {
    const r = runs.find((x) => x.id === params.rid);
    if (!r) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const b = (await request.json()) as Body;
    if (b.run_type !== undefined) r.run_type = String(b.run_type);
    if (b.with_music !== undefined) r.with_music = b.with_music !== false;
    if (b.notes !== undefined) r.notes = str(b.notes);
    if (b.element_results != null) r.element_results = buildElements(b.element_results as Body[]);
    return HttpResponse.json(serialize(r));
  }),
  http.delete("*/api/sessions/:sid/run-throughs/:rid", ({ params }) => {
    runs = runs.filter((r) => r.id !== params.rid);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get("*/api/skaters/:skaterId/training/program-stats", ({ params, request }) =>
    HttpResponse.json(aggregate(Number(params.skaterId), new URL(request.url)))),
];
