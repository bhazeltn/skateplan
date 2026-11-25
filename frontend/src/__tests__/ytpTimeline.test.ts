import { describe, expect, it } from "vitest";
import {
  buildGapCoverage,
  computeBarPosition,
  computeMarkerPosition,
  defaultSeasonRange,
  weeksBetween,
} from "@/lib/ytpTimeline";

const PLAN_START = "2026-01-01";
const PLAN_END = "2026-01-11"; // 10-day window → 1 day = 10%

describe("defaultSeasonRange", () => {
  it("returns the Jul 1 – Jun 30 window and label for a post-July date", () => {
    const r = defaultSeasonRange(new Date("2026-09-15T00:00:00Z"));
    expect(r.season_label).toBe("2026-27");
    expect(r.start_date).toBe("2026-07-01");
    expect(r.end_date).toBe("2027-06-30");
  });

  it("rolls back to the prior July for a pre-July date", () => {
    const r = defaultSeasonRange(new Date("2026-03-15T00:00:00Z"));
    expect(r.season_label).toBe("2025-26");
    expect(r.start_date).toBe("2025-07-01");
    expect(r.end_date).toBe("2026-06-30");
  });
});

describe("computeBarPosition", () => {
  it("positions a bar proportionally inside the window", () => {
    const { leftPct, widthPct } = computeBarPosition(
      "2026-01-03",
      "2026-01-05",
      PLAN_START,
      PLAN_END
    );
    expect(leftPct).toBeCloseTo(20);
    expect(widthPct).toBeCloseTo(20);
  });

  it("clamps a bar that spills past both ends to 0..100", () => {
    const { leftPct, widthPct } = computeBarPosition(
      "2025-12-01",
      "2027-01-01",
      PLAN_START,
      PLAN_END
    );
    expect(leftPct).toBe(0);
    expect(widthPct).toBe(100);
  });
});

describe("computeMarkerPosition", () => {
  it("returns a percent for a date inside the window", () => {
    expect(computeMarkerPosition("2026-01-06", PLAN_START, PLAN_END)).toBeCloseTo(50);
  });

  it("returns null for a date outside the window", () => {
    expect(computeMarkerPosition("2025-12-31", PLAN_START, PLAN_END)).toBeNull();
    expect(computeMarkerPosition("2026-02-01", PLAN_START, PLAN_END)).toBeNull();
  });

  it("includes both boundaries (0 and 100)", () => {
    expect(computeMarkerPosition(PLAN_START, PLAN_START, PLAN_END)).toBe(0);
    expect(computeMarkerPosition(PLAN_END, PLAN_START, PLAN_END)).toBe(100);
  });
});

describe("weeksBetween", () => {
  it("counts whole weeks between two ISO dates", () => {
    expect(weeksBetween("2026-01-01", "2026-01-15")).toBe(2);
    expect(weeksBetween("2026-01-01", "2026-02-05")).toBe(5);
  });
});

describe("buildGapCoverage", () => {
  it("maps open gaps to targeting phases, ignores MET, and counts", () => {
    const benchmarks = [
      { id: "a", status: "DEVELOPING" },
      { id: "b", status: "MET" },
      { id: "c", status: "NOT_STARTED" },
    ];
    const phases = [{ name: "General Prep", benchmark_ids: ["a"] }];
    const { coverage, targetedCount, openCount } = buildGapCoverage(benchmarks, phases);
    expect(coverage.a).toEqual(["General Prep"]);
    expect(coverage.c).toEqual([]);
    expect(coverage.b).toBeUndefined(); // MET excluded entirely
    expect(targetedCount).toBe(1);
    expect(openCount).toBe(2);
  });
});
