import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, TOKEN_KEY } from "@/context/AuthContext";
import { GoalsTab } from "@/components/skaters/GoalsTab";
import { server } from "@/mocks/server";

interface Goal {
  id: string;
  category: string;
  name: string;
  status: string;
  notes?: string | null;
  target_date?: string | null;
  action_plan?: string | null;
  success_criteria?: string | null;
}

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

/** Install a stateful in-memory goals (benchmarks) CRUD API for the test. */
function installGoalsApi(initial: Goal[] = []) {
  let store: Goal[] = [...initial];
  let seq = store.length;
  const posted: Record<string, unknown>[] = [];
  const patched: Record<string, unknown>[] = [];
  server.use(
    http.get("*/api/skaters/:id/benchmarks", () => HttpResponse.json(store)),
    http.post("*/api/skaters/:id/benchmarks", async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      posted.push(body);
      const rec = { id: `g${++seq}`, ...body } as Goal;
      store.push(rec);
      return HttpResponse.json(rec, { status: 201 });
    }),
    http.patch("*/api/skaters/:id/benchmarks/:bid", async ({ request, params }) => {
      const body = (await request.json()) as Record<string, unknown>;
      patched.push({ id: params.bid, ...body });
      store = store.map((i) => (i.id === params.bid ? { ...i, ...body } : i));
      return HttpResponse.json(store.find((i) => i.id === params.bid));
    })
  );
  return { posted, patched };
}

function renderTab() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <GoalsTab skaterId={1} />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Standalone goals on the Goals tab", () => {
  it("shows a + Add Goal action without any gap-analysis dependency", async () => {
    seedSession();
    installGoalsApi([]);
    renderTab();
    expect(
      await screen.findByRole("button", { name: /add goal/i })
    ).toBeInTheDocument();
    // It must not force a benchmark standard / template selection.
    expect(screen.queryByLabelText(/benchmark standard/i)).not.toBeInTheDocument();
  });

  it("exposes SMART Action Plan and Success Criteria fields in the form", async () => {
    seedSession();
    const user = userEvent.setup();
    installGoalsApi([]);
    renderTab();
    await user.click(await screen.findByRole("button", { name: /add goal/i }));
    expect(await screen.findByLabelText(/action plan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/success criteria/i)).toBeInTheDocument();
  });

  it("creates a standalone SMART goal and renders it in the active list", async () => {
    seedSession();
    const user = userEvent.setup();
    const { posted } = installGoalsApi([]);
    renderTab();

    await user.click(await screen.findByRole("button", { name: /add goal/i }));
    await user.type(await screen.findByLabelText(/goal/i), "Consistent 2S");
    await user.selectOptions(screen.getByLabelText(/category/i), "Jump");
    await user.type(screen.getByLabelText(/target date/i), "2026-12-01");
    await user.type(
      screen.getByLabelText(/action plan/i),
      "Daily 10-rep take-off drills"
    );
    await user.type(
      screen.getByLabelText(/success criteria/i),
      "5/6 clean in two run-throughs"
    );
    await user.click(screen.getByRole("button", { name: /save goal/i }));

    // The create endpoint was called with a standalone SMART payload.
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0].name).toBe("Consistent 2S");
    expect(posted[0].category).toBe("Jump");
    expect(posted[0].target_date).toBe("2026-12-01");
    expect(posted[0].status).toBe("NOT_STARTED");
    expect(posted[0].action_plan).toBe("Daily 10-rep take-off drills");
    expect(posted[0].success_criteria).toBe("5/6 clean in two run-throughs");

    // The new goal renders in the Active list with its SMART details.
    const active = await screen.findByTestId("active-goals");
    expect(within(active).getByText(/Consistent 2S/)).toBeInTheDocument();
    expect(within(active).getByText(/Daily 10-rep take-off drills/)).toBeInTheDocument();
    expect(
      within(active).getByText(/5\/6 clean in two run-throughs/)
    ).toBeInTheDocument();
  });

  it("renders a seeded goal's action plan, success criteria and status", async () => {
    seedSession();
    installGoalsApi([
      {
        id: "g1",
        category: "Jump",
        name: "Clean 3Lz",
        status: "SOLIDIFYING",
        action_plan: "Video review every session",
        success_criteria: "Positive GOE at next test",
      },
    ]);
    renderTab();
    const active = await screen.findByTestId("active-goals");
    expect(within(active).getByText(/Video review every session/)).toBeInTheDocument();
    expect(within(active).getByText(/Positive GOE at next test/)).toBeInTheDocument();
    expect(within(active).getByLabelText(/status for Clean 3Lz/i)).toHaveValue(
      "SOLIDIFYING"
    );
  });

  it("opens an Edit form populated with the goal and saves via PATCH", async () => {
    seedSession();
    const user = userEvent.setup();
    const { patched } = installGoalsApi([
      {
        id: "g1",
        category: "Jump",
        name: "Clean 3Lz",
        status: "DEVELOPING",
        action_plan: "Old plan",
        success_criteria: "Old measure",
      },
    ]);
    renderTab();

    const active = await screen.findByTestId("active-goals");
    await user.click(within(active).getByRole("button", { name: /edit/i }));

    // The form opens pre-populated with the goal's current data.
    const nameInput = await screen.findByLabelText(/goal \/ element name/i);
    expect(nameInput).toHaveValue("Clean 3Lz");
    const planInput = screen.getByLabelText(/action plan/i);
    expect(planInput).toHaveValue("Old plan");

    await user.clear(planInput);
    await user.type(planInput, "New rotation drills");
    await user.click(screen.getByRole("button", { name: /save goal/i }));

    await waitFor(() => expect(patched).toHaveLength(1));
    expect(patched[0].id).toBe("g1");
    expect(patched[0].action_plan).toBe("New rotation drills");
    expect(
      within(screen.getByTestId("active-goals")).getByText(/New rotation drills/)
    ).toBeInTheDocument();
  });

  it("changes a goal to an intermediate status via the dropdown (PATCH)", async () => {
    seedSession();
    const user = userEvent.setup();
    const { patched } = installGoalsApi([
      { id: "g1", category: "Jump", name: "Clean 3Lz", status: "NOT_STARTED" },
    ]);
    renderTab();

    const active = await screen.findByTestId("active-goals");
    await user.selectOptions(
      within(active).getByLabelText(/status for Clean 3Lz/i),
      "SOLIDIFYING"
    );

    await waitFor(() => expect(patched).toHaveLength(1));
    expect(patched[0].id).toBe("g1");
    expect(patched[0].status).toBe("SOLIDIFYING");
  });

  it("moves a goal to Completed when its status is set to Met", async () => {
    seedSession();
    const user = userEvent.setup();
    installGoalsApi([
      { id: "g1", category: "Jump", name: "Clean 3Lz", status: "DEVELOPING" },
    ]);
    renderTab();

    const active = await screen.findByTestId("active-goals");
    await user.selectOptions(
      within(active).getByLabelText(/status for Clean 3Lz/i),
      "MET"
    );

    await waitFor(() => {
      const completed = screen.getByTestId("completed-goals");
      expect(within(completed).getByText(/Clean 3Lz/)).toBeInTheDocument();
    });
    expect(
      within(screen.getByTestId("active-goals")).queryByText(/Clean 3Lz/)
    ).not.toBeInTheDocument();
  });

  it("renders a goal's progress notes on its card", async () => {
    seedSession();
    installGoalsApi([
      {
        id: "g1",
        category: "Jump",
        name: "Clean 3Lz",
        status: "DEVELOPING",
        notes: "Landing felt stronger after Tuesday's session",
      },
    ]);
    renderTab();
    const active = await screen.findByTestId("active-goals");
    expect(within(active).getByText(/Progress Notes/i)).toBeInTheDocument();
    expect(
      within(active).getByText(/Landing felt stronger after Tuesday/i)
    ).toBeInTheDocument();
  });

  it("exposes a Progress Notes textarea in the edit form and PATCHes it", async () => {
    seedSession();
    const user = userEvent.setup();
    const { patched } = installGoalsApi([
      { id: "g1", category: "Jump", name: "Clean 3Lz", status: "DEVELOPING" },
    ]);
    renderTab();

    const active = await screen.findByTestId("active-goals");
    await user.click(within(active).getByRole("button", { name: /edit/i }));

    const notesInput = await screen.findByLabelText(/progress notes/i);
    expect(notesInput).toBeInTheDocument();
    await user.type(notesInput, "Focus on free-leg checkout");
    await user.click(screen.getByRole("button", { name: /save goal/i }));

    await waitFor(() => expect(patched).toHaveLength(1));
    expect(patched[0].id).toBe("g1");
    expect(patched[0].notes).toBe("Focus on free-leg checkout");
  });
});
