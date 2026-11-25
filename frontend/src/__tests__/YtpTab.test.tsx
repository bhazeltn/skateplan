import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, TOKEN_KEY } from "@/context/AuthContext";
import { YtpTab } from "@/components/ytp/YtpTab";
import { server } from "@/mocks/server";

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

interface Bench {
  id: string;
  category: string;
  name: string;
  status: string;
}

function installBenchmarks(initial: Bench[]) {
  const store: Bench[] = [...initial];
  server.use(
    http.get("*/api/skaters/:id/benchmarks", () => HttpResponse.json(store))
  );
  return store;
}

function renderTab() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <YtpTab skaterId={1} />
      </AuthProvider>
    </MemoryRouter>
  );
}

afterEach(() => vi.restoreAllMocks());

describe("YtpTab — season plan flow", () => {
  it("shows the empty state, then creating a plan populates the timeline + switcher", async () => {
    seedSession();
    installBenchmarks([]);
    const user = userEvent.setup();
    renderTab();

    const createBtn = await screen.findByRole("button", { name: /create season plan/i });
    await user.click(createBtn);

    const dialog = await screen.findByRole("dialog");
    await user.clear(within(dialog).getByLabelText(/title/i));
    await user.type(within(dialog).getByLabelText(/title/i), "My 2026-27 Plan");
    await user.click(within(dialog).getByRole("button", { name: /save plan/i }));

    // Switcher option + timeline heading reflect the new plan.
    expect(await screen.findByRole("combobox", { name: /season plan/i })).toBeInTheDocument();
    expect(await screen.findByText("My 2026-27 Plan")).toBeInTheDocument();
    expect(screen.getByText(/phases \(0\)/i)).toBeInTheDocument();
  });

  it("adds a phase with a linked benchmark and flips the gap from Unassigned to Targeted", async () => {
    seedSession();
    installBenchmarks([
      { id: "bm1", category: "Jumps", name: "Triple Axel", status: "DEVELOPING" },
      { id: "bm2", category: "Spins", name: "CCoSp4", status: "NOT_STARTED" },
    ]);
    const user = userEvent.setup();
    renderTab();

    await user.click(await screen.findByRole("button", { name: /create season plan/i }));
    let dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /save plan/i }));

    // Both gaps start Unassigned.
    expect((await screen.findAllByText(/unassigned/i)).length).toBeGreaterThanOrEqual(2);

    await user.click(await screen.findByRole("button", { name: /add phase/i }));
    dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^name$/i), "General Prep");
    await user.type(within(dialog).getByLabelText(/target effort/i), "6");
    await user.click(within(dialog).getByRole("checkbox", { name: /triple axel/i }));
    await user.click(within(dialog).getByRole("button", { name: /save phase/i }));

    // Phase card rendered with its linked benchmark.
    const card = await screen.findByRole("article");
    expect(within(card).getByRole("heading", { name: "General Prep" })).toBeInTheDocument();
    expect(within(card).getByText(/triple axel/i)).toBeInTheDocument();

    // Sidebar: Triple Axel now Targeted, CCoSp4 still Unassigned.
    expect(await screen.findByText(/targeted: general prep/i)).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 2 open gaps targeted/i)).toBeInTheDocument();
  });

  it("deletes a phase and updates the list", async () => {
    seedSession();
    installBenchmarks([]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderTab();

    await user.click(await screen.findByRole("button", { name: /create season plan/i }));
    let dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /save plan/i }));

    await user.click(await screen.findByRole("button", { name: /add phase/i }));
    dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^name$/i), "Taper Block");
    await user.click(within(dialog).getByRole("button", { name: /save phase/i }));

    const card = await screen.findByRole("article");
    await user.click(within(card).getByRole("button", { name: /delete/i }));
    await waitFor(() =>
      expect(screen.queryByRole("article")).not.toBeInTheDocument()
    );
    expect(screen.getByText(/phases \(0\)/i)).toBeInTheDocument();
  });

  it("renders a competition within the plan window as a timeline marker", async () => {
    seedSession();
    installBenchmarks([]);
    server.use(
      http.get("*/api/skaters/:id/competitions", () =>
        HttpResponse.json([{ id: "e1", competition_id: "c1", skater_id: 1 }])
      ),
      http.get("*/api/competitions", () =>
        HttpResponse.json([
          { id: "c1", name: "Autumn Classic", start_date: "2026-11-01" },
        ])
      )
    );
    const user = userEvent.setup();
    renderTab();

    await user.click(await screen.findByRole("button", { name: /create season plan/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /save plan/i }));

    expect(await screen.findByText("Autumn Classic")).toBeInTheDocument();
  });
});
