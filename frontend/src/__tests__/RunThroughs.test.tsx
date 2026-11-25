import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, TOKEN_KEY } from "@/context/AuthContext";
import { TrainingTab } from "@/components/training/TrainingTab";
import { server } from "@/mocks/server";
import { seedRunThroughPrograms } from "@/mocks/runThroughHandlers";

function seedToken() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

const SP_ELEMENTS = [
  { segment_order: 1, element_code: "3Lz", is_second_half_bonus: false },
  { segment_order: 2, element_code: "3F", is_second_half_bonus: false },
  { segment_order: 3, element_code: "CCoSp", is_second_half_bonus: false },
];

function installPrograms() {
  seedRunThroughPrograms([
    { id: "p-sp", name: "Short Program", segment: "SP" },
    { id: "p-fs", name: "Free Skate", segment: "FS" },
  ]);
  server.use(
    http.get("*/api/skaters/:id", () =>
      HttpResponse.json({
        skater_id: 1, first_name: "Ava", last_name: "Lee",
        has_active_restriction: false, restrictions: [],
        programs: [
          { id: "p-sp", program_type: "SP", title: "Short Program", is_archived: false },
          { id: "p-fs", program_type: "FS", title: "Free Skate", is_archived: false },
        ],
      })
    ),
    http.get("*/api/programs/:id", ({ params }) =>
      HttpResponse.json({
        id: String(params.id), skater_id: 1,
        program_type: params.id === "p-fs" ? "FS" : "SP",
        title: params.id === "p-fs" ? "Free Skate" : "Short Program",
        program_elements: SP_ELEMENTS,
      })
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

async function logSession(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /log session/i }));
  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: /^on-ice$/i }));
  await user.click(within(dialog).getByRole("button", { name: /^60 min$/i }));
  await user.click(within(dialog).getByRole("button", { name: /save session/i }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
}

async function openRunThroughModal(user: ReturnType<typeof userEvent.setup>) {
  const card = await screen.findByTestId("session-card");
  await user.click(within(card).getByRole("button", { name: /run-throughs/i }));
  const panel = await screen.findByTestId("run-throughs-panel");
  await user.click(within(panel).getByRole("button", { name: /log run-through/i }));
  return screen.findByRole("dialog");
}

async function logRunThrough(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await openRunThroughModal(user);
  await user.selectOptions(within(dialog).getByLabelText(/program/i), "p-sp");
  await within(dialog).findByTestId("rt-el-3F");
  const row = within(dialog).getByTestId("rt-el-3F");
  await user.click(within(row).getByRole("button", { name: /^fall$/i }));
  await user.click(within(dialog).getByRole("button", { name: /save run-through/i }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
}

describe("Program run-throughs", () => {
  it("opens the modal and auto-populates a selected program's planned elements as clean", async () => {
    seedToken();
    installPrograms();
    const user = userEvent.setup();
    renderTab();
    await logSession(user);

    const dialog = await openRunThroughModal(user);
    await user.selectOptions(within(dialog).getByLabelText(/program/i), "p-sp");

    const row = await within(dialog).findByTestId("rt-el-3Lz");
    expect(within(dialog).getByTestId("rt-el-3F")).toBeInTheDocument();
    expect(within(dialog).getByTestId("rt-el-CCoSp")).toBeInTheDocument();
    // Each element defaults to the Clean outcome (active pill).
    expect(within(row).getByRole("button", { name: /^clean$/i })).toHaveClass("bg-blue-600");
  });

  it("logs a run-through: it appears in the panel and the consistency card updates", async () => {
    seedToken();
    installPrograms();
    const user = userEvent.setup();
    renderTab();
    await logSession(user);
    await logRunThrough(user);

    const panel = screen.getByTestId("run-throughs-panel");
    expect(await within(panel).findByText("Short Program")).toBeInTheDocument();
    expect(within(panel).getByText(/2\/3 clean/)).toBeInTheDocument();

    const card = screen.getByTestId("program-consistency");
    expect(await within(card).findByText("Short Program")).toBeInTheDocument();
    expect(within(card).getByText(/1 run/)).toBeInTheDocument();
    expect(within(card).getByText(/1 full/)).toBeInTheDocument();
    expect(within(card).getByText(/66\.7/)).toBeInTheDocument();
  });

  it("edits a run-through's type and deletes it, updating panel and card", async () => {
    seedToken();
    installPrograms();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderTab();
    await logSession(user);
    await logRunThrough(user);

    const panel = screen.getByTestId("run-throughs-panel");
    await within(panel).findByText("Short Program");

    // Edit: change run type Full -> Half.
    await user.click(within(panel).getByRole("button", { name: /^edit$/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^half$/i }));
    await user.click(within(dialog).getByRole("button", { name: /save run-through/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    const card = screen.getByTestId("program-consistency");
    await waitFor(() => expect(within(card).getByText(/0 full/)).toBeInTheDocument());

    // Delete the run-through.
    await user.click(within(panel).getByRole("button", { name: /^delete$/i }));
    await waitFor(() =>
      expect(within(panel).queryByText("Short Program")).not.toBeInTheDocument()
    );
    await waitFor(() =>
      expect(
        within(screen.getByTestId("program-consistency")).queryByText("Short Program")
      ).not.toBeInTheDocument()
    );
  });
});
