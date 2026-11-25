import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  competitionsOnDate,
  formatCompDateRange,
  partitionCompetitions,
} from "@/lib/calendarHelpers";
import type { RosterCompetitionOut } from "@/lib/competitionScheduleApi";

function comp(
  id: string,
  start: string | null,
  end: string | null = null
): RosterCompetitionOut {
  return { id, name: id, start_date: start, end_date: end, location: null, entries: [] };
}

const TODAY = "2026-11-25";

describe("partitionCompetitions", () => {
  const items = [
    comp("future", "2026-12-10", "2026-12-12"),
    comp("ongoing", "2026-11-24", "2026-11-26"), // spans today -> upcoming
    comp("past", "2026-10-01", "2026-10-03"),
    comp("soon", "2026-11-28"),
    comp("undated", null),
    comp("oldest", "2026-01-01"),
  ];

  it("splits upcoming (end>=today, asc), past (desc) and undated", () => {
    const { upcoming, past, undated } = partitionCompetitions(items, TODAY);
    expect(upcoming.map((c) => c.id)).toEqual(["ongoing", "soon", "future"]);
    expect(past.map((c) => c.id)).toEqual(["past", "oldest"]);
    expect(undated.map((c) => c.id)).toEqual(["undated"]);
  });

  it("uses start_date when end_date is absent for the today boundary", () => {
    const { upcoming, past } = partitionCompetitions(
      [comp("single", "2026-11-25")],
      TODAY
    );
    expect(upcoming.map((c) => c.id)).toEqual(["single"]);
    expect(past).toEqual([]);
  });
});

describe("buildMonthGrid", () => {
  it("returns 35 or 42 Sunday-aligned cells covering the month", () => {
    const cells = buildMonthGrid(2026, 10); // November 2026
    expect(cells.length % 7).toBe(0);
    expect([35, 42]).toContain(cells.length);
    // First cell is a Sunday.
    expect(new Date(`${cells[0].iso}T00:00:00Z`).getUTCDay()).toBe(0);
    // Last cell is a Saturday.
    expect(new Date(`${cells[cells.length - 1].iso}T00:00:00Z`).getUTCDay()).toBe(6);
    const inMonthDays = cells.filter((c) => c.inMonth).map((c) => c.day);
    expect(inMonthDays[0]).toBe(1);
    expect(inMonthDays[inMonthDays.length - 1]).toBe(30); // Nov has 30 days
    expect(inMonthDays.length).toBe(30);
  });

  it("pads short months to at least 35 cells (Feb 2026)", () => {
    const cells = buildMonthGrid(2026, 1); // February 2026
    expect([35, 42]).toContain(cells.length);
    expect(cells.filter((c) => c.inMonth).length).toBe(28);
  });
});

describe("competitionsOnDate", () => {
  const items = [
    comp("multi", "2026-11-24", "2026-11-26"),
    comp("single", "2026-11-25"),
    comp("other", "2026-12-01"),
    comp("undated", null),
  ];

  it("includes single-day and multi-day spans covering the date", () => {
    const ids = competitionsOnDate(items, "2026-11-25").map((c) => c.id);
    expect(ids.sort()).toEqual(["multi", "single"]);
  });

  it("includes a multi-day competition on its first and last day", () => {
    expect(competitionsOnDate(items, "2026-11-24").map((c) => c.id)).toEqual(["multi"]);
    expect(competitionsOnDate(items, "2026-11-26").map((c) => c.id)).toEqual(["multi"]);
  });

  it("returns none for a date with no competitions", () => {
    expect(competitionsOnDate(items, "2026-11-20")).toEqual([]);
  });
});

describe("formatCompDateRange", () => {
  it("returns TBD when there is no start date", () => {
    expect(formatCompDateRange(null, null)).toBe("TBD");
  });

  it("formats a single day (no end or end equals start)", () => {
    expect(formatCompDateRange("2026-11-27", null)).toBe("Nov 27, 2026");
    expect(formatCompDateRange("2026-11-27", "2026-11-27")).toBe("Nov 27, 2026");
  });

  it("formats a same-month range compactly", () => {
    expect(formatCompDateRange("2026-11-27", "2026-11-29")).toBe("Nov 27–29, 2026");
  });

  it("formats a cross-month, same-year range", () => {
    expect(formatCompDateRange("2026-11-27", "2026-12-02")).toBe("Nov 27 – Dec 2, 2026");
  });

  it("formats a cross-year range", () => {
    expect(formatCompDateRange("2026-12-30", "2027-01-02")).toBe(
      "Dec 30, 2026 – Jan 2, 2027"
    );
  });
});
