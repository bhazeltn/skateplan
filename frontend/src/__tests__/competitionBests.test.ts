import { describe, expect, it } from "vitest";
import {
  computeSkaterBests,
  getBadgeKind,
  getCurrentSkatingSeason,
  getSkatingSeason,
  type BestMark,
  type BestsEntryInput,
} from "@/lib/competitionBests";
import type { SegmentResultOut } from "@/lib/types";

function res(
  partial: Partial<SegmentResultOut> & { id: string; segment: string }
): SegmentResultOut {
  return { segment_bonus: 0, ...partial } as SegmentResultOut;
}

function entry(
  id: string,
  name: string,
  date: string,
  results: SegmentResultOut[]
): BestsEntryInput {
  return { entry: { id }, competition: { name, start_date: date }, results };
}

describe("getSkatingSeason (Jul 1 – Jun 30)", () => {
  it("labels dates to the correct YYYY-YY season", () => {
    expect(getSkatingSeason("2025-11-06")).toBe("2025-26");
    expect(getSkatingSeason("2026-06-30")).toBe("2025-26");
    expect(getSkatingSeason("2026-07-01")).toBe("2026-27");
    expect(getSkatingSeason("2027-03-10")).toBe("2026-27");
  });

  it("getCurrentSkatingSeason returns a YYYY-YY label", () => {
    expect(getCurrentSkatingSeason(new Date("2025-11-06"))).toBe("2025-26");
    expect(getCurrentSkatingSeason()).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("computeSkaterBests — PB career vs SB season scope", () => {
  it("PB is career-wide; SB is strictly within the target season", () => {
    const entries = [
      entry("e1", "Autumn 2024", "2024-11-01", [res({ id: "r1", segment: "SP", tss: 70 })]),
      entry("e2", "Autumn 2025", "2025-11-01", [res({ id: "r2", segment: "SP", tss: 60 })]),
    ];
    const b = computeSkaterBests(entries, "2025-26");
    expect(b.sp.tss.pb?.value).toBe(70);
    expect(b.sp.tss.pb?.entryId).toBe("e1");
    expect(b.sp.tss.sb?.value).toBe(60);
    expect(b.sp.tss.sb?.entryId).toBe("e2");
  });
});

describe("computeSkaterBests — Combined Total requires both SP and FS", () => {
  it("counts an entry only when it has BOTH an SP and an FS result", () => {
    const entries = [
      entry("eA", "Both", "2025-11-01", [
        res({ id: "a-sp", segment: "SP", tss: 40 }),
        res({ id: "a-fs", segment: "FS", tss: 80 }),
      ]),
      entry("eB", "FS only", "2025-12-01", [res({ id: "b-fs", segment: "FS", tss: 200 })]),
    ];
    const b = computeSkaterBests(entries, "2025-26");
    expect(b.total.pb?.value).toBe(120);
    expect(b.total.pb?.entryId).toBe("eA");
    expect(b.total.sb?.value).toBe(120);
  });

  it("does NOT register a Combined Total for a single-segment entry", () => {
    const entries = [
      entry("solo", "SP only", "2025-11-01", [res({ id: "s1", segment: "SP", tss: 99 })]),
    ];
    const b = computeSkaterBests(entries, "2025-26");
    expect(b.total.pb).toBeNull();
    expect(b.total.sb).toBeNull();
  });
});

describe("computeSkaterBests — independent SP & FS field bests", () => {
  it("tracks SP TES and SP PCS PBs set at different events", () => {
    const entries = [
      entry("e1", "Event 1", "2025-11-01", [
        res({ id: "r1", segment: "SP", tss: 50, tes: 30, pcs: 20 }),
      ]),
      entry("e2", "Event 2", "2025-12-01", [
        res({ id: "r2", segment: "SP", tss: 70, tes: 25, pcs: 45 }),
      ]),
    ];
    const b = computeSkaterBests(entries, "2025-26");
    expect(b.sp.tes.pb?.value).toBe(30);
    expect(b.sp.tes.pb?.entryId).toBe("e1");
    expect(b.sp.pcs.pb?.value).toBe(45);
    expect(b.sp.pcs.pb?.entryId).toBe("e2");
    expect(b.sp.tes.pb?.resultId).toBe("r1");
  });

  it("tracks FS TSS/TES/PCS independently of SP", () => {
    const entries = [
      entry("e1", "Event 1", "2025-11-01", [
        res({ id: "fs1", segment: "FS", tss: 100, tes: 60, pcs: 40 }),
      ]),
    ];
    const b = computeSkaterBests(entries, "2025-26");
    expect(b.fs.tss.pb?.value).toBe(100);
    expect(b.fs.tes.pb?.value).toBe(60);
    expect(b.fs.pcs.pb?.value).toBe(40);
    expect(b.sp.tss.pb).toBeNull();
  });
});

describe("computeSkaterBests — empty / no-result entries", () => {
  it("returns clean nulls for no entries", () => {
    const b = computeSkaterBests([], "2025-26");
    expect(b.total.pb).toBeNull();
    expect(b.sp.tss.pb).toBeNull();
    expect(b.fs.pcs.sb).toBeNull();
    expect(b.season).toBe("2025-26");
  });

  it("returns clean nulls for an entry with no results", () => {
    const b = computeSkaterBests(
      [entry("x", "Empty", "2025-11-01", [])],
      "2025-26"
    );
    expect(b.sp.tss.pb).toBeNull();
    expect(b.total.pb).toBeNull();
  });

  it("ignores null/undefined/NaN numeric fields defensively", () => {
    const entries = [
      entry("e1", "Event", "2025-11-01", [
        res({ id: "r1", segment: "SP", tss: null, tes: undefined }),
      ]),
    ];
    const b = computeSkaterBests(entries, "2025-26");
    expect(b.sp.tss.pb).toBeNull();
    expect(b.sp.tes.pb).toBeNull();
  });
});

describe("getBadgeKind", () => {
  const pb: BestMark = {
    value: 100, entryId: "e1", competitionName: "A", date: "2025-11-01",
  };
  const sb: BestMark = {
    value: 90, entryId: "e2", competitionName: "B", date: "2025-12-01",
  };

  it("returns PB for the PB holder, SB for the SB holder, else null", () => {
    expect(getBadgeKind("e1", pb, sb)).toBe("PB");
    expect(getBadgeKind("e2", pb, sb)).toBe("SB");
    expect(getBadgeKind("e3", pb, sb)).toBeNull();
  });

  it("shows only PB when the same entry holds both PB and SB", () => {
    expect(getBadgeKind("e1", pb, { ...sb, entryId: "e1" })).toBe("PB");
  });

  it("returns null when marks are null", () => {
    expect(getBadgeKind("e1", null, null)).toBeNull();
  });
});
