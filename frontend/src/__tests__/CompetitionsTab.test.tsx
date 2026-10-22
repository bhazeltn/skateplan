import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, TOKEN_KEY } from "@/context/AuthContext";
import { CompetitionsTab } from "@/components/skaters/CompetitionsTab";
import { mockCompetitions } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import type { SkaterProgram } from "@/lib/types";

interface Entry {
  id: string;
  competition_id: string;
  skater_id: number;
  level_id?: number | null;
  sp_program_id?: string | null;
  fs_program_id?: string | null;
  status: string;
}

const PROGRAMS: SkaterProgram[] = [
  { id: "p-sp", program_type: "SP", title: "Short Program 2026", is_archived: false },
  { id: "p-fs", program_type: "FS", title: "Free Skate 2026", is_archived: false },
];

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

/** Install a stateful in-memory competitions/entries/results API. */
function installCompApi(
  entries: Entry[] = [],
  protocols: Record<string, Record<string, unknown>[]> = {}
) {
  const store = [...entries];
  const results = { ...protocols };
  const posted: Record<string, unknown>[] = [];
  const postedResults: Record<string, unknown>[] = [];
  server.use(
    http.get("*/api/competitions", () => HttpResponse.json(mockCompetitions)),
    http.get("*/api/skaters/:id/competitions", () => HttpResponse.json(store)),
    http.post("*/api/competitions/:cid/entries", async ({ request, params }) => {
      const body = (await request.json()) as Record<string, unknown>;
      posted.push({ competition_id: params.cid, ...body });
      const rec = {
        id: `e${store.length + 1}`,
        competition_id: params.cid as string,
        status: "prospective",
        ...body,
      } as Entry;
      store.push(rec);
      return HttpResponse.json(rec, { status: 201 });
    }),
    http.get("*/api/competitions/entries/:eid/protocol", ({ params }) =>
      HttpResponse.json({
        entry_id: params.eid,
        segments: results[params.eid as string] ?? [],
      })
    ),
    http.post(
      "*/api/competitions/entries/:eid/results",
      async ({ request, params }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const eid = params.eid as string;
        postedResults.push({ entry_id: eid, ...body });
        const n = (k: string) => Number(body[k] ?? 0);
        const tss = n("tes") + n("pcs") + n("segment_bonus") - n("deductions");
        const rec = { id: `r-${eid}`, tss, ...body };
        results[eid] = [...(results[eid] ?? []), rec];
        return HttpResponse.json(rec, { status: 201 });
      }
    )
  );
  return { posted, postedResults };
}

function renderTab() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <CompetitionsTab skaterId={1} programs={PROGRAMS} />
      </AuthProvider>
    </MemoryRouter>
  );
}

const PAST_ENTRY: Entry = {
  id: "e1",
  competition_id: "comp-autumn",
  skater_id: 1,
  status: "prospective",
};
const FUTURE_ENTRY: Entry = {
  id: "e2",
  competition_id: "comp-winter",
  skater_id: 1,
  sp_program_id: "p-sp",
  fs_program_id: "p-fs",
  status: "prospective",
};

describe("Competitions tab", () => {
  it("renders the skater's entries with their competition names", async () => {
    seedSession();
    installCompApi([PAST_ENTRY]);
    renderTab();
    expect(
      await screen.findByText(/Autumn Classic 2026/)
    ).toBeInTheDocument();
  });

  it("opens an Add Entry modal with competition, level and program fields", async () => {
    seedSession();
    const user = userEvent.setup();
    installCompApi([]);
    renderTab();
    await user.click(await screen.findByRole("button", { name: /add entry/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/competition/i)).toBeInTheDocument();
    const levelField = screen.getByLabelText(/level/i);
    expect(levelField.tagName).toBe("SELECT");
    expect(
      await screen.findByRole("option", { name: /junior/i })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/entering short program/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/entering free skate/i)).toBeInTheDocument();
  });

  it("creates an entry posting competition, level and assigned programs", async () => {
    seedSession();
    const user = userEvent.setup();
    const { posted } = installCompApi([]);
    renderTab();

    await user.click(await screen.findByRole("button", { name: /add entry/i }));
    await user.type(await screen.findByLabelText(/competition/i), "Autumn");
    await user.click(
      await screen.findByRole("button", { name: /autumn classic 2026/i })
    );
    await user.selectOptions(
      await screen.findByLabelText(/level/i),
      await screen.findByRole("option", { name: /junior/i })
    );
    await user.click(screen.getByLabelText(/entering short program/i));
    await user.click(screen.getByLabelText(/entering free skate/i));
    await user.click(screen.getByRole("button", { name: /save entry/i }));

    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0].competition_id).toBe("comp-autumn");
    expect(posted[0].level_id).toBe(202);
    expect(posted[0].sp_program_id).toBeNull();
    expect(posted[0].fs_program_id).toBeNull();
    expect(
      await screen.findByText(/Autumn Classic 2026/)
    ).toBeInTheDocument();
  });

  it("marks a future entry Upcoming and lists its assigned programs", async () => {
    seedSession();
    installCompApi([FUTURE_ENTRY]);
    renderTab();
    const row = await screen.findByTestId("entry-e2");
    expect(within(row).getByText(/Upcoming/i)).toBeInTheDocument();
    expect(within(row).getByText(/Short Program 2026/)).toBeInTheDocument();
    expect(within(row).getByText(/Free Skate 2026/)).toBeInTheDocument();
  });

  it("offers Log Results on a past entry and opens a result modal with a disabled PDF upload", async () => {
    seedSession();
    const user = userEvent.setup();
    installCompApi([PAST_ENTRY]);
    renderTab();
    await user.click(await screen.findByRole("button", { name: /log results/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/segment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/overall rank/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^tes$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^pcs$/i)).toBeInTheDocument();
    const pdf = screen.getByRole("button", { name: /upload detail sheet/i });
    expect(pdf).toBeDisabled();
    expect(pdf).toHaveAttribute("title", "Coming in next sprint");
  });

  it("auto-calculates TSS as (TES + PCS + Bonus) - Deductions", async () => {
    seedSession();
    const user = userEvent.setup();
    installCompApi([PAST_ENTRY]);
    renderTab();
    await user.click(await screen.findByRole("button", { name: /log results/i }));
    await user.type(await screen.findByLabelText(/^tes$/i), "50");
    await user.type(screen.getByLabelText(/^pcs$/i), "40");
    await user.type(screen.getByLabelText(/bonus/i), "2");
    await user.type(screen.getByLabelText(/deductions/i), "1");
    await waitFor(() =>
      expect(screen.getByTestId("tss-value")).toHaveTextContent("91.00")
    );
  });

  it("saves a result and displays TSS and placement on the entry row", async () => {
    seedSession();
    const user = userEvent.setup();
    const { postedResults } = installCompApi([PAST_ENTRY]);
    renderTab();
    await user.click(await screen.findByRole("button", { name: /log results/i }));
    await user.selectOptions(await screen.findByLabelText(/segment/i), "SP");
    await user.type(screen.getByLabelText(/overall rank/i), "3");
    await user.type(screen.getByLabelText(/^tes$/i), "50");
    await user.type(screen.getByLabelText(/^pcs$/i), "40");
    await user.type(screen.getByLabelText(/deductions/i), "2");
    await user.click(screen.getByRole("button", { name: /save result/i }));

    await waitFor(() => expect(postedResults).toHaveLength(1));
    expect(postedResults[0].segment).toBe("SP");
    expect(postedResults[0].overall_rank).toBe(3);

    const row = await screen.findByTestId("entry-e1");
    expect(within(row).getByText(/TSS 88.00/)).toBeInTheDocument();
    expect(within(row).getByText(/Overall 3/)).toBeInTheDocument();
  });
});
