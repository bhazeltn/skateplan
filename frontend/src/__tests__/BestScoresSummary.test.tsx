import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { BestScoresSummary } from "@/components/skaters/BestScoresSummary";
import type { BestMark, SkaterBests } from "@/lib/competitionBests";

function mark(value: number, entryId = "e1"): BestMark {
  return { value, entryId, competitionName: "Autumn 2025", date: "2025-11-01" };
}

const BESTS: SkaterBests = {
  season: "2025-26",
  total: { pb: mark(201.5), sb: mark(190.25) },
  sp: {
    tss: { pb: mark(70.1), sb: mark(66.3) },
    tes: { pb: mark(38.4), sb: mark(35.2) },
    pcs: { pb: mark(32.7), sb: mark(31.1) },
  },
  fs: {
    tss: { pb: mark(131.4), sb: mark(124.0) },
    tes: { pb: mark(70.9), sb: mark(66.8) },
    pcs: { pb: mark(60.5), sb: mark(57.2) },
  },
};

describe("BestScoresSummary", () => {
  it("renders nothing when there are no PB marks", () => {
    const empty: SkaterBests = {
      season: "2025-26",
      total: { pb: null, sb: null },
      sp: { tss: { pb: null, sb: null }, tes: { pb: null, sb: null }, pcs: { pb: null, sb: null } },
      fs: { tss: { pb: null, sb: null }, tes: { pb: null, sb: null }, pcs: { pb: null, sb: null } },
    };
    const { container } = render(
      <BestScoresSummary bests={empty} seasonLabel="2025-26" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the header, season label, and Combined Total PB & SB", () => {
    render(<BestScoresSummary bests={BESTS} seasonLabel="2025-26" />);
    expect(screen.getByText(/Best Scores/i)).toBeInTheDocument();
    expect(screen.getByText(/2025-26 Season/i)).toBeInTheDocument();
    const total = screen.getByTestId("best-card-total");
    expect(within(total).getByText("201.50")).toBeInTheDocument();
    expect(within(total).getByText("190.25")).toBeInTheDocument();
  });

  it("renders SP TSS/TES/PCS PB & SB", () => {
    render(<BestScoresSummary bests={BESTS} seasonLabel="2025-26" />);
    const sp = screen.getByTestId("best-card-sp");
    expect(within(sp).getByText("70.10")).toBeInTheDocument();
    expect(within(sp).getByText("66.30")).toBeInTheDocument();
    expect(within(sp).getByText("38.40")).toBeInTheDocument();
    expect(within(sp).getByText("32.70")).toBeInTheDocument();
  });

  it("renders FS TSS/TES/PCS PB & SB", () => {
    render(<BestScoresSummary bests={BESTS} seasonLabel="2025-26" />);
    const fs = screen.getByTestId("best-card-fs");
    expect(within(fs).getByText("131.40")).toBeInTheDocument();
    expect(within(fs).getByText("124.00")).toBeInTheDocument();
    expect(within(fs).getByText("70.90")).toBeInTheDocument();
    expect(within(fs).getByText("60.50")).toBeInTheDocument();
  });

  it("shows an em dash for a null SB value", () => {
    const partial: SkaterBests = {
      ...BESTS,
      total: { pb: mark(201.5), sb: null },
    };
    render(<BestScoresSummary bests={partial} seasonLabel="2025-26" />);
    const total = screen.getByTestId("best-card-total");
    expect(within(total).getByText("—")).toBeInTheDocument();
  });
});
