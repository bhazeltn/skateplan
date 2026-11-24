import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, TOKEN_KEY } from "@/context/AuthContext";
import { GapAnalysisTab } from "@/components/skaters/GapAnalysisTab";
import { server } from "@/mocks/server";

interface Bench {
  id: string;
  category: string;
  name: string;
  status: string;
  notes?: string | null;
}
interface SetItem {
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
  items: SetItem[];
}

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

/** Stateful skater-benchmark CRUD. Returns the live store for assertions. */
function installSkaterApi(initial: Bench[] = []) {
  const store: Bench[] = [...initial];
  let seq = store.length;
  server.use(
    http.get("*/api/skaters/:id/benchmarks", () => HttpResponse.json(store)),
    http.post("*/api/skaters/:id/benchmarks", async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      const rec = { id: `b${++seq}`, ...body } as Bench;
      store.push(rec);
      return HttpResponse.json(rec, { status: 201 });
    }),
    http.patch("*/api/skaters/:id/benchmarks/:bid", async ({ request, params }) => {
      const body = (await request.json()) as Record<string, unknown>;
      const idx = store.findIndex((i) => i.id === params.bid);
      store[idx] = { ...store[idx], ...body };
      return HttpResponse.json(store[idx]);
    }),
    http.delete("*/api/skaters/:id/benchmarks/:bid", ({ params }) => {
      const idx = store.findIndex((i) => i.id === params.bid);
      if (idx >= 0) store.splice(idx, 1);
      return new HttpResponse(null, { status: 204 });
    })
  );
  return store;
}

function renderTab() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <GapAnalysisTab skaterId={1} />
      </AuthProvider>
    </MemoryRouter>
  );
}

afterEach(() => vi.restoreAllMocks());

describe("Benchmark Sets — apply / save / manage", () => {
  it("applies a set, shows created/skipped summary and refreshes the matrix", async () => {
    seedSession();
    const skaterStore = installSkaterApi([]);
    const set: SetRow = {
      id: "bset-1",
      coach_id: 10,
      name: "Pre-Novice Core",
      description: "Core targets",
      created_at: new Date().toISOString(),
      items: [
        { id: "i1", category: "Jumps", title: "Triple Axel", notes: null, sort_order: 0 },
        { id: "i2", category: "Spins", title: "CCoSp4", notes: null, sort_order: 1 },
      ],
    };
    server.use(
      http.get("*/api/benchmark-sets", () => HttpResponse.json([set])),
      // Apply copies the set's items onto the skater, then reports counts.
      http.post("*/api/benchmark-sets/:setId/apply/:skaterId", () => {
        set.items.forEach((it) =>
          skaterStore.push({
            id: `applied-${it.id}`,
            category: it.category,
            name: it.title,
            status: "NOT_STARTED",
          })
        );
        return HttpResponse.json({
          created_count: 2,
          skipped_count: 1,
          created_items: set.items.map((i) => ({ category: i.category, title: i.title })),
        });
      })
    );

    const user = userEvent.setup();
    renderTab();
    await user.click(await screen.findByRole("button", { name: /apply set/i }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Pre-Novice Core/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /^apply$/i }));

    expect(await screen.findByText(/added 2/i)).toBeInTheDocument();
    expect(screen.getByText(/skipped/i)).toHaveTextContent(/1/);
    // Matrix refreshed with the applied benchmarks.
    expect(await screen.findByText(/Triple Axel/)).toBeInTheDocument();
    expect(screen.getByText(/CCoSp4/)).toBeInTheDocument();
  });

  it("saves the skater's benchmarks as a set, mapping name → item title", async () => {
    seedSession();
    installSkaterApi([
      { id: "b1", category: "Jumps", name: "Triple Axel", status: "DEVELOPING" },
      { id: "b2", category: "Spins", name: "CCoSp4", status: "MET" },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let captured: any = null;
    server.use(
      http.get("*/api/benchmark-sets", () => HttpResponse.json([])),
      http.post("*/api/benchmark-sets", async ({ request }) => {
        captured = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { id: "new", coach_id: 10, name: "x", description: null, created_at: "", items: [] },
          { status: 201 }
        );
      })
    );

    const user = userEvent.setup();
    renderTab();
    await screen.findByText(/Triple Axel/);
    await user.click(screen.getByRole("button", { name: /save as set/i }));

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/set name/i), "My Set");
    await user.click(within(dialog).getByRole("button", { name: /save set/i }));

    await waitFor(() => expect(captured).not.toBeNull());
    const items = captured.items as { title: string; category: string }[];
    expect(items.map((i) => i.title)).toEqual(["Triple Axel", "CCoSp4"]);
    expect(items[0].category).toBe("Jumps");
  });

  it("hides Save as Set when the skater has no benchmarks", async () => {
    seedSession();
    installSkaterApi([]);
    server.use(http.get("*/api/benchmark-sets", () => HttpResponse.json([])));
    renderTab();
    await screen.findByRole("button", { name: /apply set/i });
    expect(
      screen.queryByRole("button", { name: /save as set/i })
    ).not.toBeInTheDocument();
  });

  it("creates, edits and deletes a set in Manage Sets", async () => {
    seedSession();
    installSkaterApi([]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    // Uses the default in-memory benchmarkSetHandlers (empty at start).

    const user = userEvent.setup();
    renderTab();
    await user.click(await screen.findByRole("button", { name: /manage sets/i }));

    let dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /new set/i }));
    await user.type(within(dialog).getByLabelText(/set name/i), "Set A");
    await user.click(within(dialog).getByRole("button", { name: /add item/i }));
    await user.type(within(dialog).getByLabelText(/item 1 title/i), "Triple Lutz");
    await user.click(within(dialog).getByRole("button", { name: /save set/i }));
    expect(await within(dialog).findByText(/Set A/)).toBeInTheDocument();

    // Edit
    await user.click(within(dialog).getByRole("button", { name: /^edit$/i }));
    const nameField = within(dialog).getByLabelText(/set name/i);
    await user.clear(nameField);
    await user.type(nameField, "Set A2");
    await user.click(within(dialog).getByRole("button", { name: /save set/i }));
    expect(await within(dialog).findByText(/Set A2/)).toBeInTheDocument();

    // Delete
    await user.click(within(dialog).getByRole("button", { name: /^delete$/i }));
    await waitFor(() =>
      expect(within(dialog).queryByText(/Set A2/)).not.toBeInTheDocument()
    );
  });
});
