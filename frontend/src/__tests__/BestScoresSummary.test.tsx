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

function named(
  value: number,
  competitionName: string,
  date: string
): BestMark {
  return { value, entryId: "e1", competitionName, date };
}

const PROV: SkaterBests = {
  season: "2025-26",
  total: {
    pb: named(201.5, "Nationals Final", "2026-01-15"),
    sb: named(190.25, "Autumn Total SB", "2025-10-02"),
  },
  sp: {
    tss: {
      pb: named(70.1, "SP PB Cup", "2026-02-01"),
      sb: named(66.3, "SP SB Open", "2025-09-10"),
    },
    tes: { pb: named(38.4, "x", "2025-01-01"), sb: named(35.2, "y", "2025-01-02") },
    pcs: { pb: named(32.7, "z", "2025-01-03"), sb: named(31.1, "w", "2025-01-04") },
  },
  fs: {
    tss: {
      pb: named(131.4, "FS PB Trophy", "2026-03-05"),
      sb: named(124.0, "FS SB Classic", "2025-11-20"),
    },
    tes: { pb: named(70.9, "a", "2025-02-01"), sb: named(66.8, "b", "2025-02-02") },
    pcs: { pb: named(60.5, "c", "2025-02-03"), sb: named(57.2, "d", "2025-02-04") },
  },
};

describe("BestScoresSummary headline provenance", () => {
  it("shows competition name and date for both PB and SB on all three cards", () => {
    render(<BestScoresSummary bests={PROV} seasonLabel="2025-26" />);

    const total = screen.getByTestId("best-card-total");
    expect(within(total).getByText("Nationals Final")).toBeInTheDocument();
    expect(within(total).getByText("2026-01-15")).toBeInTheDocument();
    expect(within(total).getByText("Autumn Total SB")).toBeInTheDocument();
    expect(within(total).getByText("2025-10-02")).toBeInTheDocument();

    const sp = screen.getByTestId("best-card-sp");
    expect(within(sp).getByText("SP PB Cup")).toBeInTheDocument();
    expect(within(sp).getByText("2026-02-01")).toBeInTheDocument();
    expect(within(sp).getByText("SP SB Open")).toBeInTheDocument();
    expect(within(sp).getByText("2025-09-10")).toBeInTheDocument();

    const fs = screen.getByTestId("best-card-fs");
    expect(within(fs).getByText("FS PB Trophy")).toBeInTheDocument();
    expect(within(fs).getByText("2026-03-05")).toBeInTheDocument();
    expect(within(fs).getByText("FS SB Classic")).toBeInTheDocument();
    expect(within(fs).getByText("2025-11-20")).toBeInTheDocument();
  });

  it("renders no provenance metadata beneath a null headline mark", () => {
    const partial: SkaterBests = {
      ...PROV,
      total: { pb: named(201.5, "Nationals Final", "2026-01-15"), sb: null },
    };
    render(<BestScoresSummary bests={partial} seasonLabel="2025-26" />);
    const total = screen.getByTestId("best-card-total");
    // PB provenance still present; the removed SB's name must be gone.
    expect(within(total).getByText("Nationals Final")).toBeInTheDocument();
    expect(within(total).queryByText("Autumn Total SB")).not.toBeInTheDocument();
  });

  it("puts `Name (date)` in the provenance container title attribute", () => {
    render(<BestScoresSummary bests={PROV} seasonLabel="2025-26" />);
    expect(
      screen.getByTitle("Nationals Final (2026-01-15)")
    ).toBeInTheDocument();
    expect(screen.getByTitle("SP SB Open (2025-09-10)")).toBeInTheDocument();
    expect(screen.getByTitle("FS PB Trophy (2026-03-05)")).toBeInTheDocument();
  });
});
