import { describe, expect, it } from "vitest";
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
  seedRunThroughPrograms([{ id: "p-sp", name: "Short Program", segment: "SP" }]);
  server.use(
    http.get("*/api/skaters/:id", () =>
      HttpResponse.json({
        skater_id: 1, first_name: "Ava", last_name: "Lee",
        has_active_restriction: false, restrictions: [],
        programs: [
          { id: "p-sp", program_type: "SP", title: "Short Program", is_archived: false },
        ],
      })
    ),
    http.get("*/api/programs/:id", ({ params }) =>
      HttpResponse.json({
        id: String(params.id), skater_id: 1, program_type: "SP",
        title: "Short Program", program_elements: SP_ELEMENTS,
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

async function openAttempts(user: ReturnType<typeof userEvent.setup>) {
  const card = await screen.findByTestId("session-card");
  await user.click(within(card).getByRole("button", { name: /attempts/i }));
  return screen.findByTestId("attempts-panel");
}

describe("Element-aware tags + two-tier consistency", () => {
  it("switches execution options and tech tags by element category", async () => {
    seedToken();
    const user = userEvent.setup();
    renderTab();
    await logSession(user);
    const panel = await openAttempts(user);

    await user.type(within(panel).getByPlaceholderText(/element code/i), "3Lo");
    // Jump execution options + jump tech tags.
    expect(within(panel).getByRole("button", { name: /^pop$/i })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /^step-out$/i })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /^q$/i })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /^e$/i })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /^no combo$/i })).toBeInTheDocument();

    await user.clear(within(panel).getByPlaceholderText(/element code/i));
    await user.type(within(panel).getByPlaceholderText(/element code/i), "CCoSp4");
    // Spin tech tags appear; jump-only tag is gone.
    expect(within(panel).getByRole("button", { name: /^missed feature$/i })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /^travel$/i })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /^v$/i })).toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: /^no combo$/i })).not.toBeInTheDocument();
  });

  it("logs a clean-with-call attempt: tag badge + two-tier consistency", async () => {
    seedToken();
    const user = userEvent.setup();
    renderTab();
    await logSession(user);
    const panel = await openAttempts(user);

    await user.type(within(panel).getByPlaceholderText(/element code/i), "3Lo");
    await user.click(within(panel).getByRole("button", { name: /^q$/i }));
    await user.click(within(panel).getByRole("button", { name: /^\+ add$/i }));

    // Attempt row shows the element and its tag badge.
    expect(await within(panel).findByText("3Lo")).toBeInTheDocument();
    expect(within(panel).getByText("q")).toBeInTheDocument();

    const ec = screen.getByTestId("element-consistency");
    expect(await within(ec).findByText("3Lo")).toBeInTheDocument();
    // clean=0, with_calls=1, total=1 -> completed 100%, 0% clean, q x1.
    expect(within(ec).getByText(/100%/)).toBeInTheDocument();
    expect(within(ec).getByText(/0% clean/)).toBeInTheDocument();
    expect(within(ec).getByText(/q ×1/)).toBeInTheDocument();
  });

  it("logs a run-through with a tagged clean element: tag chip + overall two-tier", async () => {
    seedToken();
    installPrograms();
    const user = userEvent.setup();
    renderTab();
    await logSession(user);

    const card = await screen.findByTestId("session-card");
    await user.click(within(card).getByRole("button", { name: /run-throughs/i }));
    const panel = await screen.findByTestId("run-throughs-panel");
    await user.click(within(panel).getByRole("button", { name: /log run-through/i }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/program/i), "p-sp");

    const row = await within(dialog).findByTestId("rt-el-3Lz");
    await user.click(within(row).getByRole("button", { name: /^q$/i }));
    await user.click(within(dialog).getByRole("button", { name: /save run-through/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    // Element chip shows the tag inline.
    expect(await within(panel).findByText(/\(q\)/)).toBeInTheDocument();

    const pc = screen.getByTestId("program-consistency");
    await within(pc).findByText("Short Program");
    // 3Lz clean+q, 3F clean, CCoSp clean -> clean=2, with_calls=1, total=3.
    expect(within(pc).getByText(/100% completed/)).toBeInTheDocument();
    expect(within(pc).getByText(/66\.7% clean/)).toBeInTheDocument();
    expect(within(pc).getByText(/q ×1/)).toBeInTheDocument();
  });
});
