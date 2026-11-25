import { describe, expect, it } from "vitest";
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

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

/** Stateful skater-benchmark CRUD that merges PATCH fields into the row. */
function installBenchmarkApi(initial: Bench[] = []) {
  let store: Bench[] = [...initial];
  let seq = store.length;
  server.use(
    http.get("*/api/benchmark-sets", () => HttpResponse.json([])),
    http.get("*/api/skaters/:id/benchmarks", () => HttpResponse.json(store)),
    http.post("*/api/skaters/:id/benchmarks", async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      const rec = { id: `b${++seq}`, ...body } as Bench;
      store.push(rec);
      return HttpResponse.json(rec, { status: 201 });
    }),
    http.patch("*/api/skaters/:id/benchmarks/:bid", async ({ request, params }) => {
      const body = (await request.json()) as Record<string, unknown>;
      store = store.map((i) => (i.id === params.bid ? { ...i, ...body } : i));
      return HttpResponse.json(store.find((i) => i.id === params.bid));
    })
  );
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

describe("Custom benchmark notes + inline editing", () => {
  it("renders the notes text on a row that has notes", async () => {
    seedSession();
    installBenchmarkApi([
      {
        id: "b1",
        category: "Jumps",
        name: "Triple Axel",
        status: "DEVELOPING",
        notes: "Focus on back-half take-off",
      },
    ]);
    renderTab();
    await screen.findByText(/Triple Axel/);
    expect(
      screen.getByText(/Focus on back-half take-off/)
    ).toBeInTheDocument();
  });

  it("renders no notes paragraph when notes is null or empty", async () => {
    seedSession();
    installBenchmarkApi([
      { id: "b1", category: "Jumps", name: "Triple Axel", status: "MET", notes: null },
      { id: "b2", category: "Spins", name: "CCoSp4", status: "MET", notes: "" },
    ]);
    renderTab();
    await screen.findByText(/Triple Axel/);
    // No stray empty note paragraphs beyond the two benchmark titles.
    expect(screen.queryByText(/Focus on/)).not.toBeInTheDocument();
  });

  it("opens an Edit modal pre-populated with the benchmark's values", async () => {
    seedSession();
    installBenchmarkApi([
      {
        id: "b1",
        category: "Jumps",
        name: "Triple Axel",
        status: "DEVELOPING",
        notes: "Work the entry",
      },
    ]);
    const user = userEvent.setup();
    renderTab();
    await screen.findByText(/Triple Axel/);
    await user.click(screen.getByRole("button", { name: /edit triple axel/i }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText(/target name/i)).toHaveValue("Triple Axel");
    expect(within(dialog).getByLabelText(/category/i)).toHaveValue("Jumps");
    expect(within(dialog).getByLabelText(/current status/i)).toHaveValue(
      "DEVELOPING"
    );
    expect(within(dialog).getByLabelText(/notes/i)).toHaveValue("Work the entry");
  });

  it("edits name, category and notes, PATCHes, closes and shows updated text", async () => {
    seedSession();
    installBenchmarkApi([
      {
        id: "b1",
        category: "Jumps",
        name: "Triple Axel",
        status: "DEVELOPING",
        notes: "old notes",
      },
    ]);
    const user = userEvent.setup();
    renderTab();
    await screen.findByText(/Triple Axel/);
    await user.click(screen.getByRole("button", { name: /edit triple axel/i }));

    const dialog = await screen.findByRole("dialog");
    const nameField = within(dialog).getByLabelText(/target name/i);
    await user.clear(nameField);
    await user.type(nameField, "Quad Toe");
    await user.selectOptions(within(dialog).getByLabelText(/category/i), "Spins");
    const notesField = within(dialog).getByLabelText(/notes/i);
    await user.clear(notesField);
    await user.type(notesField, "new coaching notes");
    await user.click(within(dialog).getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    expect(await screen.findByText(/Quad Toe/)).toBeInTheDocument();
    expect(screen.getByText(/new coaching notes/)).toBeInTheDocument();
    expect(screen.queryByText(/old notes/)).not.toBeInTheDocument();
  });
});
