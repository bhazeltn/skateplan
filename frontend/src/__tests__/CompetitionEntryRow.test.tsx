import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CompetitionEntryRow,
  type ResultModalRequest,
} from "@/components/skaters/CompetitionEntryRow";
import type { JoinedEntry } from "@/components/skaters/useSkaterEntries";
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

function renderRow(item: JoinedEntry, onResult = vi.fn()) {
  render(
    <ul>
      <CompetitionEntryRow item={item} programs={PROGRAMS} onResult={onResult}
        onEdit={vi.fn()} onDelete={vi.fn()} />
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
