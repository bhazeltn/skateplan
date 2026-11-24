import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CompetitionEntryRow,
  type ResultModalRequest,
} from "@/components/skaters/CompetitionEntryRow";
import type { JoinedEntry } from "@/components/skaters/useSkaterEntries";
import {
  computeSkaterBests,
  type SkaterBests,
} from "@/lib/competitionBests";
import type { EntryOut, SegmentResultOut, SkaterProgram } from "@/lib/types";

const PROGRAMS: SkaterProgram[] = [
  { id: "p-sp", program_type: "SP", title: "Short Program 2026", is_archived: false },
  { id: "p-fs", program_type: "FS", title: "Free Skate 2026", is_archived: false },
];

function makeEntry(overrides: Partial<EntryOut> = {}): EntryOut {
  return {
    id: "e1",
    competition_id: "comp-autumn",
    skater_id: 1,
    entered_sp: false,
    entered_fs: false,
    status: "registered",
    ...overrides,
  };
}

function makeItem(
  entry: EntryOut,
  results: SegmentResultOut[] = []
): JoinedEntry {
  return {
    entry,
    competition: { id: "comp-autumn", name: "Autumn Classic 2026",
      start_date: "2020-01-01" } as JoinedEntry["competition"],
    results,
  };
}

const EMPTY_BESTS: SkaterBests = computeSkaterBests([], "2025-26");

function renderRow(
  item: JoinedEntry,
  onResult = vi.fn(),
  bests: SkaterBests = EMPTY_BESTS
) {
  render(
    <ul>
      <CompetitionEntryRow item={item} programs={PROGRAMS} bests={bests}
        onResult={onResult} onEdit={vi.fn()} onDelete={vi.fn()} />
    </ul>
  );
  return { onResult };
}

describe("CompetitionEntryRow explicit SP/FS segments", () => {
  it("renders distinct SP and FS log buttons when both flags are set", () => {
    const item = makeItem(makeEntry({ entered_sp: true, entered_fs: true }));
    renderRow(item);
    const row = screen.getByTestId("entry-e1");
    expect(within(row).getByRole("button", { name: /log sp/i })).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: /log fs/i })).toBeInTheDocument();
  });

  it("requests a fixedSegment when logging a specific segment", async () => {
    const user = userEvent.setup();
    const item = makeItem(makeEntry({ entered_sp: true, entered_fs: true }));
    const { onResult } = renderRow(item);
    await user.click(screen.getByRole("button", { name: /log fs/i }));
    expect(onResult).toHaveBeenCalledWith<[ResultModalRequest]>({
      entryId: "e1",
      segment: "FS",
    });
  });

  it("shows TSS and an Edit button for a recorded segment, Log for the other", () => {
    const spResult: SegmentResultOut = {
      id: "r-sp", segment: "SP", tss: 88, overall_rank: 3, segment_bonus: 0,
    };
    const item = makeItem(
      makeEntry({ entered_sp: true, entered_fs: true }),
      [spResult]
    );
    renderRow(item);
    const sp = screen.getByTestId("segment-SP");
    expect(within(sp).getByText(/TSS 88.00/)).toBeInTheDocument();
    expect(within(sp).getByRole("button", { name: /edit sp/i })).toBeInTheDocument();
    const fs = screen.getByTestId("segment-FS");
    expect(within(fs).getByRole("button", { name: /log fs/i })).toBeInTheDocument();
  });

  it("opens the modal pre-populated (initialResult) when editing a segment", async () => {
    const user = userEvent.setup();
    const spResult: SegmentResultOut = {
      id: "r-sp", segment: "SP", tss: 88, overall_rank: 3, segment_bonus: 0,
    };
    const item = makeItem(makeEntry({ entered_sp: true }), [spResult]);
    const { onResult } = renderRow(item);
    await user.click(screen.getByRole("button", { name: /edit sp/i }));
    expect(onResult).toHaveBeenCalledWith<[ResultModalRequest]>({
      entryId: "e1",
      initialResult: spResult,
    });
  });
});

function podiumItem(overallRank: number): JoinedEntry {
  const sp: SegmentResultOut = {
    id: "r-sp", segment: "SP", tss: 30.37, segment_bonus: 0,
  };
  const fs: SegmentResultOut = {
    id: "r-fs", segment: "FS", tss: 66.74, overall_rank: overallRank,
    segment_bonus: 0,
  };
  return makeItem(makeEntry({ entered_sp: true, entered_fs: true }), [sp, fs]);
}

describe("CompetitionEntryRow placement summary", () => {
  it("renders combined total, Gold 1st badge, and gold accent", () => {
    renderRow(podiumItem(1));
    const row = screen.getByTestId("entry-e1");
    expect(within(row).getByText("97.11")).toBeInTheDocument();
    const badge = within(row).getByTestId("entry-result-badge");
    expect(badge).toHaveTextContent("1st");
    expect(row.className).toContain("border-l-amber-400");
  });

  it("renders Silver 2nd styling for overall_rank 2", () => {
    renderRow(podiumItem(2));
    const row = screen.getByTestId("entry-e1");
    expect(within(row).getByTestId("entry-result-badge")).toHaveTextContent("2nd");
    expect(row.className).toContain("border-l-slate-400");
  });

  it("renders Bronze 3rd styling for overall_rank 3", () => {
    renderRow(podiumItem(3));
    const row = screen.getByTestId("entry-e1");
    expect(within(row).getByTestId("entry-result-badge")).toHaveTextContent("3rd");
    expect(row.className).toContain("border-l-orange-400");
  });

  it("renders neutral 5th badge and no podium accent for overall_rank 5", () => {
    renderRow(podiumItem(5));
    const row = screen.getByTestId("entry-e1");
    expect(within(row).getByTestId("entry-result-badge")).toHaveTextContent("5th");
    expect(row.className).not.toContain("border-l-4");
  });

  it("renders no total block and no badge when there are no results", () => {
    renderRow(makeItem(makeEntry({ entered_sp: true, entered_fs: true })));
    const row = screen.getByTestId("entry-e1");
    expect(within(row).queryByTestId("entry-result-badge")).not.toBeInTheDocument();
    expect(within(row).queryByText(/^Total$/)).not.toBeInTheDocument();
  });
});

function datedItem(
  id: string,
  date: string,
  spTss: number,
  fsTss: number
): JoinedEntry {
  return {
    entry: makeEntry({ id, entered_sp: true, entered_fs: true }),
    competition: { id: "c", name: "Meet", start_date: date } as
      JoinedEntry["competition"],
    results: [
      { id: `${id}-sp`, segment: "SP", tss: spTss, segment_bonus: 0 },
      { id: `${id}-fs`, segment: "FS", tss: fsTss, overall_rank: 1,
        segment_bonus: 0 },
    ],
  };
}

describe("CompetitionEntryRow inline PB/SB pills", () => {
  it("shows a PB pill on the total and SP when the entry holds the career best", () => {
    const item = datedItem("e1", "2025-11-06", 40, 70);
    const bests = computeSkaterBests([item], "2025-26");
    renderRow(item, vi.fn(), bests);
    const row = screen.getByTestId("entry-e1");
    expect(within(row).getAllByTestId("best-pill-pb").length).toBeGreaterThan(0);
    expect(within(screen.getByTestId("segment-SP"))
      .getByTestId("best-pill-pb")).toBeInTheDocument();
  });

  it("shows an SB pill when the entry holds only the season best (older entry holds PB)", () => {
    const older = datedItem("e-old", "2020-01-01", 60, 90); // higher → career PB
    const current = datedItem("e1", "2025-11-06", 40, 70); // lower, in-season → SB
    const bests = computeSkaterBests([older, current], "2025-26");
    renderRow(current, vi.fn(), bests);
    const row = screen.getByTestId("entry-e1");
    expect(within(row).getAllByTestId("best-pill-sb").length).toBeGreaterThan(0);
    expect(within(row).queryByTestId("best-pill-pb")).not.toBeInTheDocument();
  });
});
