import { http, HttpResponse } from "msw";

// In-memory store for coach-owned benchmark sets so CRUD + apply behave
// realistically in tests (list reflects created/updated/deleted). Reset between
// tests via resetBenchmarkSetStore(); CRUD-flow tests may also override with
// server.use().
interface Item {
  id: string;
  category: string;
  title: string;
  notes: string | null;
  sort_order: number;
}
interface SetRow {
  id: string;
  coach_id: number;
  name: string;
  description: string | null;
  created_at: string;
  items: Item[];
}

let store: SetRow[] = [];
let seq = 0;

export function resetBenchmarkSetStore(): void {
  store = [];
  seq = 0;
}

function buildItems(raw: unknown): Item[] {
  const items = (raw ?? []) as Record<string, unknown>[];
  return items.map((it, idx) => ({
    id: `bsi-${++seq}`,
    category: String(it.category ?? ""),
    title: String(it.title ?? ""),
    notes: (it.notes as string | null) ?? null,
    sort_order: typeof it.sort_order === "number" ? it.sort_order : idx,
  }));
}

export const benchmarkSetHandlers = [
  http.get("*/api/benchmark-sets", () => HttpResponse.json(store)),
  http.post("*/api/benchmark-sets", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const row: SetRow = {
      id: `bset-${++seq}`,
      coach_id: 10,
      name: String(body.name ?? ""),
      description: (body.description as string | null) ?? null,
      created_at: new Date().toISOString(),
      items: buildItems(body.items),
    };
    store.push(row);
    return HttpResponse.json(row, { status: 201 });
  }),
  http.patch("*/api/benchmark-sets/:setId", async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const row = store.find((s) => s.id === params.setId);
    if (!row) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    if (body.name !== undefined) row.name = String(body.name);
    if (body.description !== undefined)
      row.description = (body.description as string | null) ?? null;
    if (body.items !== undefined) row.items = buildItems(body.items);
    return HttpResponse.json(row);
  }),
  http.delete("*/api/benchmark-sets/:setId", ({ params }) => {
    store = store.filter((s) => s.id !== params.setId);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(
    "*/api/benchmark-sets/:setId/apply/:skaterId",
    ({ params }) => {
      const row = store.find((s) => s.id === params.setId);
      const items = row?.items ?? [];
      return HttpResponse.json({
        created_count: items.length,
        skipped_count: 0,
        created_items: items.map((i) => ({
          category: i.category,
          title: i.title,
        })),
      });
    }
  ),
];
