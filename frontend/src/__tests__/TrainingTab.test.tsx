import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, TOKEN_KEY } from "@/context/AuthContext";
import { TrainingTab } from "@/components/training/TrainingTab";
import { server } from "@/mocks/server";

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

// Active YTP phase that always contains "today" so WeeklyLoadBar has planned targets.
function installActivePhase() {
  server.use(
    http.get("*/api/skaters/:id/ytp", () =>
      HttpResponse.json([
        {
          id: "plan-1", skater_id: 1, season_label: "2025-26", title: "Plan",
          start_date: "2000-01-01", end_date: "2999-12-31", primary_goal: null,
          notes: null, created_at: "2000-01-01T00:00:00Z",
          phases: [
            {
              id: "ph-1", plan_id: "plan-1", name: "Base Build",
              phase_type: "general_prep", start_date: "2000-01-01",
              end_date: "2999-12-31", target_on_ice_hours_per_week: 10,
              target_off_ice_hours_per_week: 4, target_rpe: 7,
              intensity_level: "moderate", primary_focus: null, notes: null,
              benchmark_ids: [],
            },
          ],
        },
      ])
    )
  );
}

function renderTab() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <TrainingTab skaterId={1} />
      </AuthProvider>
    </MemoryRouter>
  );
}

async function logSession(user: ReturnType<typeof userEvent.setup>, preset: string, rpe: string) {
  await user.click(await screen.findByRole("button", { name: /log session/i }));
  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: /^on-ice$/i }));
  await user.click(within(dialog).getByRole("button", { name: new RegExp(`^${preset} min$`, "i") }));
  await user.click(within(dialog).getByRole("button", { name: new RegExp(`^effort ${rpe}$`, "i") }));
  await user.click(within(dialog).getByRole("button", { name: /save session/i }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
}

afterEach(() => vi.restoreAllMocks());

describe("TrainingTab", () => {
  it("renders the empty state when the skater has no sessions", async () => {
    seedSession();
    renderTab();
    expect(await screen.findByText(/no training sessions logged yet/i)).toBeInTheDocument();
  });

  it("logs a session that appears in the list and updates the weekly load bar + planned targets", async () => {
    seedSession();
    installActivePhase();
    const user = userEvent.setup();
    renderTab();
    await screen.findByText(/no training sessions logged yet/i);

    await logSession(user, "60", "8");

    const card = await screen.findByTestId("session-card");
    expect(within(card).getByText("60 min")).toBeInTheDocument();
    expect(within(card).getByText(/Effort 8\/10/)).toBeInTheDocument();
    expect(within(card).getByText(/On-Ice/)).toBeInTheDocument();

    const bar = screen.getByTestId("weekly-load-bar");
    expect(within(bar).getByText(/1\.0 h/)).toBeInTheDocument(); // 60 min actual on-ice
    expect(within(bar).getByText(/10 h\/wk/)).toBeInTheDocument(); // planned on-ice target
  });

  it("edits a session and the list reflects the new duration", async () => {
    seedSession();
    const user = userEvent.setup();
    renderTab();
    await logSession(user, "60", "7");
    expect(within(await screen.findByTestId("session-card")).getByText("60 min")).toBeInTheDocument();

    await user.click(within(screen.getByTestId("session-card")).getByRole("button", { name: /edit/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^90 min$/i }));
    await user.click(within(dialog).getByRole("button", { name: /save session/i }));

    await waitFor(() =>
      expect(within(screen.getByTestId("session-card")).getByText("90 min")).toBeInTheDocument()
    );
  });

  it("deletes a session (confirm-guarded) and returns to the empty state", async () => {
    seedSession();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderTab();
    await logSession(user, "60", "7");
    await screen.findByTestId("session-card");

    await user.click(within(screen.getByTestId("session-card")).getByRole("button", { name: /delete/i }));
    expect(await screen.findByText(/no training sessions logged yet/i)).toBeInTheDocument();
  });

  it("logs and deletes an attempt, updating both the panel and Element Consistency", async () => {
    seedSession();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderTab();
    await logSession(user, "60", "7");
    const card = await screen.findByTestId("session-card");

    await user.click(within(card).getByRole("button", { name: /attempts/i }));
    const panel = await screen.findByTestId("attempts-panel");
    await user.type(within(panel).getByPlaceholderText(/element code/i), "3Lo");
    await user.click(within(panel).getByRole("button", { name: /^clean$/i }));
    const count = within(panel).getByLabelText(/attempts count/i);
    await user.clear(count);
    await user.type(count, "3");
    await user.click(within(panel).getByRole("button", { name: /^\+ add$/i }));

    expect(await within(panel).findByText("3Lo")).toBeInTheDocument();
    const ec = screen.getByTestId("element-consistency");
    expect(await within(ec).findByText("3Lo")).toBeInTheDocument();
    expect(within(ec).getByText(/100% clean/)).toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: /delete attempt/i }));
    await waitFor(() => expect(within(panel).queryByText("3Lo")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(within(screen.getByTestId("element-consistency")).queryByText("3Lo")).not.toBeInTheDocument()
    );
  });
});
