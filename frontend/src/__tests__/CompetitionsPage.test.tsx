import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { AppShell } from "@/components/layout/AppShell";
import { CompetitionsPage } from "@/components/competitions/CompetitionsPage";
import { TOKEN_KEY } from "@/context/AuthContext";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/utils";

// "today" is pinned during Winter Nationals (2026-12-11..13) so the calendar
// opens on a month containing a seeded competition, deterministically.
const TODAY = "2026-12-12";

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

describe("CompetitionsPage — list view", () => {
  it("renders upcoming and past competitions with skater badges, levels, scores and profile links", async () => {
    seedSession();
    renderWithProviders(<CompetitionsPage today={TODAY} />);

    expect(await screen.findByText("Winter Nationals")).toBeInTheDocument();
    expect(screen.getByText("Autumn Classic")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /upcoming competitions/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /past competitions/i })).toBeInTheDocument();

    // Skater name links to the profile route.
    const avaLinks = screen.getAllByRole("link", { name: /Ava Nguyen/ });
    expect(avaLinks[0]).toHaveAttribute("href", "/skaters/1");

    // Levels and a 2-decimal score from the past competition.
    expect(screen.getAllByText("Senior").length).toBeGreaterThan(0);
    expect(screen.getByText("198.45")).toBeInTheDocument();
    expect(screen.getByText("172.30")).toBeInTheDocument();
  });

  it("narrows competitions and entries when a skater is selected", async () => {
    seedSession();
    renderWithProviders(<CompetitionsPage today={TODAY} />);
    await screen.findByText("Winter Nationals");

    await userEvent.selectOptions(
      screen.getByLabelText(/skater filter/i),
      "Ava Nguyen"
    );

    // Spring Invitational (Mia only) disappears; Liam's badge is gone.
    await waitFor(() =>
      expect(screen.queryByText("Spring Invitational")).not.toBeInTheDocument()
    );
    expect(screen.queryByRole("link", { name: /Liam Torres/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Ava Nguyen/ }).length).toBeGreaterThan(0);
  });
});

describe("CompetitionsPage — calendar view", () => {
  it("shows the month grid, competition chips and an openable detail card", async () => {
    seedSession();
    renderWithProviders(<CompetitionsPage today={TODAY} />);
    await screen.findByText("Winter Nationals");

    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    expect(screen.getByText("December 2026")).toBeInTheDocument();

    // Chip carries the competition name and a skater-count pill.
    const chips = screen.getAllByRole("button", { name: /Winter Nationals/ });
    expect(chips.length).toBeGreaterThan(0);
    expect(within(chips[0]).getByText(/2 skaters/i)).toBeInTheDocument();

    await userEvent.click(chips[0]);
    const detail = await screen.findByTestId("competition-detail");
    expect(within(detail).getByText("Winter Nationals")).toBeInTheDocument();
    expect(within(detail).getByRole("link", { name: /Ava Nguyen/ })).toHaveAttribute(
      "href",
      "/skaters/1"
    );
  });
});

describe("CompetitionsPage — editing", () => {
  it("opens the edit modal pre-populated with the competition's fields", async () => {
    seedSession();
    renderWithProviders(<CompetitionsPage today={TODAY} />);
    await screen.findByText("Winter Nationals");

    await userEvent.click(screen.getByRole("button", { name: /edit winter nationals/i }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByDisplayValue("Winter Nationals")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("2026-12-11")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("2026-12-13")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("Calgary")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("Canada")).toBeInTheDocument();
  });

  it("blocks submit and does not call PATCH when end_date precedes start_date", async () => {
    seedSession();
    let patchCalled = false;
    server.use(
      http.patch("*/api/competitions/:id", () => {
        patchCalled = true;
        return HttpResponse.json({});
      })
    );
    renderWithProviders(<CompetitionsPage today={TODAY} />);
    await screen.findByText("Winter Nationals");

    await userEvent.click(screen.getByRole("button", { name: /edit winter nationals/i }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("End Date"), {
      target: { value: "2026-12-01" },
    });

    expect(within(dialog).getByText(/end date must be on or after/i)).toBeInTheDocument();
    const save = within(dialog).getByRole("button", { name: /save changes/i });
    expect(save).toBeDisabled();
    await userEvent.click(save);
    expect(patchCalled).toBe(false);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("saves an updated name and end_date, calls PATCH, and reflects it in the list", async () => {
    seedSession();
    let patchedId: string | null = null;
    server.use(
      http.patch("*/api/competitions/:id", async ({ params, request }) => {
        patchedId = String(params.id);
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: params.id, entries: [], ...body });
      })
    );
    renderWithProviders(<CompetitionsPage today={TODAY} />);
    await screen.findByText("Winter Nationals");

    await userEvent.click(screen.getByRole("button", { name: /edit winter nationals/i }));
    const dialog = await screen.findByRole("dialog");
    const nameInput = within(dialog).getByDisplayValue("Winter Nationals");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Winter Gala");
    fireEvent.change(within(dialog).getByLabelText("End Date"), {
      target: { value: "2026-12-20" },
    });
    await userEvent.click(within(dialog).getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(patchedId).toBe("comp-winter");
    expect(await screen.findByText("Winter Gala")).toBeInTheDocument();
    expect(screen.queryByText("Winter Nationals")).not.toBeInTheDocument();
    expect(screen.getByText(/Dec 11.*20, 2026/)).toBeInTheDocument();
  });
});

describe("CompetitionsPage — navigation", () => {
  it("renders a Competitions sidebar link but no Sessions link", () => {
    seedSession();
    renderWithProviders(
      <AppShell>
        <CompetitionsPage today={TODAY} />
      </AppShell>
    );
    const sidebar = screen.getByTestId("desktop-sidebar");
    expect(within(sidebar).getByText("Competitions")).toBeInTheDocument();
    expect(within(sidebar).queryByText("Sessions")).not.toBeInTheDocument();
  });
});
