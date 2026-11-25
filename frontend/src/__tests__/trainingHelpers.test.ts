import { describe, expect, it } from "vitest";
import {
  ATTEMPT_OUTCOMES,
  SESSION_TYPES,
  findActivePhase,
  getCurrentWeekRange,
  sortSessionsNewestFirst,
  summarizeWeeklyLoad,
} from "@/lib/trainingHelpers";
import type { SessionOut } from "@/lib/trainingApi";
import type { YearlyPlanOut } from "@/lib/ytpApi";

function session(partial: Partial<SessionOut> & { id: string }): SessionOut {
  return {
    id: partial.id,
    skater_id: 1,
    logged_by_user_id: 10,
    session_date: partial.session_date ?? "2026-01-14",
    session_type: partial.session_type ?? "on_ice",
    duration_minutes: partial.duration_minutes ?? 60,
    rpe: partial.rpe ?? 7,
    location: partial.location ?? null,
    notes: partial.notes ?? null,
  };
}

function plan(phases: YearlyPlanOut["phases"]): YearlyPlanOut {
  return {
    id: "plan-1", skater_id: 1, season_label: "2025-26", title: "Plan",
    start_date: "2025-07-01", end_date: "2026-06-30", primary_goal: null,
    notes: null, created_at: "2025-07-01T00:00:00Z", phases,
  };
}

function phase(id: string, start: string, end: string): YearlyPlanOut["phases"][number] {
  return {
    id, plan_id: "plan-1", name: `Phase ${id}`, phase_type: "general_prep",
    start_date: start, end_date: end, target_on_ice_hours_per_week: 10,
    target_off_ice_hours_per_week: 4, target_rpe: 7, intensity_level: "moderate",
    primary_focus: null, notes: null, benchmark_ids: [],
  };
}

describe("training canonical constants (from backend Phase 0)", () => {
  it("SESSION_TYPES contains the backend on_ice / off_ice strings", () => {
    expect(SESSION_TYPES).toContain("on_ice");
    expect(SESSION_TYPES).toContain("off_ice");
  });
  it("ATTEMPT_OUTCOMES contains the backend clean / fall / step_out strings", () => {
    expect(ATTEMPT_OUTCOMES).toEqual(
      expect.arrayContaining(["clean", "fall", "step_out"])
    );
  });
});

describe("getCurrentWeekRange", () => {
  it("returns the Monday–Sunday span for a midweek date", () => {
    const r = getCurrentWeekRange(new Date(2026, 0, 14)); // Wed Jan 14 2026
    expect(r).toEqual({ startIso: "2026-01-12", endIso: "2026-01-18" });
  });
  it("treats Sunday as the last day of the same week (not the next)", () => {
    const r = getCurrentWeekRange(new Date(2026, 0, 18)); // Sun Jan 18 2026
    expect(r).toEqual({ startIso: "2026-01-12", endIso: "2026-01-18" });
  });
  it("returns the Monday itself as start when given a Monday", () => {
    const r = getCurrentWeekRange(new Date(2026, 0, 12)); // Mon Jan 12 2026
    expect(r.startIso).toBe("2026-01-12");
  });
});

describe("findActivePhase", () => {
  const plans = [plan([phase("p1", "2026-01-01", "2026-03-31"), phase("p2", "2026-04-01", "2026-06-30")])];
  it("returns the phase whose date range contains today (inclusive)", () => {
    expect(findActivePhase(plans, "2026-02-15")?.id).toBe("p1");
    expect(findActivePhase(plans, "2026-01-01")?.id).toBe("p1"); // start boundary
    expect(findActivePhase(plans, "2026-06-30")?.id).toBe("p2"); // end boundary
  });
  it("returns null when today falls outside every phase", () => {
    expect(findActivePhase(plans, "2026-07-15")).toBeNull();
  });
  it("returns null when there are no plans", () => {
    expect(findActivePhase([], "2026-02-15")).toBeNull();
  });
});

describe("summarizeWeeklyLoad", () => {
  const week = { startIso: "2026-01-12", endIso: "2026-01-18" };
  it("separates on-ice vs off-ice minutes and averages RPE within the week", () => {
    const sessions = [
      session({ id: "a", session_date: "2026-01-13", session_type: "on_ice", duration_minutes: 60, rpe: 8 }),
      session({ id: "b", session_date: "2026-01-15", session_type: "off_ice", duration_minutes: 45, rpe: 6 }),
      session({ id: "c", session_date: "2026-01-16", session_type: "on_ice", duration_minutes: 90, rpe: 7 }),
      session({ id: "out", session_date: "2026-01-05", session_type: "on_ice", duration_minutes: 120, rpe: 9 }),
    ];
    const r = summarizeWeeklyLoad(sessions, week);
    expect(r.onIceMinutes).toBe(150); // 60 + 90
    expect(r.offIceMinutes).toBe(45);
    expect(r.sessionCount).toBe(3);
    expect(r.avgRpe).toBe(7); // (8+6+7)/3
  });
  it("returns zeroes (no NaN) when no sessions fall within the week", () => {
    const r = summarizeWeeklyLoad([session({ id: "x", session_date: "2025-12-01" })], week);
    expect(r).toEqual({ onIceMinutes: 0, offIceMinutes: 0, sessionCount: 0, avgRpe: 0 });
  });
});

describe("sortSessionsNewestFirst", () => {
  it("orders by session_date descending and does not mutate the input", () => {
    const input = [
      session({ id: "old", session_date: "2026-01-01" }),
      session({ id: "new", session_date: "2026-03-01" }),
      session({ id: "mid", session_date: "2026-02-01" }),
    ];
    const snapshot = input.map((s) => s.id);
    const r = sortSessionsNewestFirst(input);
    expect(r.map((s) => s.id)).toEqual(["new", "mid", "old"]);
    expect(input.map((s) => s.id)).toEqual(snapshot);
    expect(r).not.toBe(input);
  });
  it("places sessions with no date last", () => {
    const r = sortSessionsNewestFirst([
      session({ id: "dated", session_date: "2026-02-01" }),
      session({ id: "undated", session_date: null }),
    ]);
    expect(r.map((s) => s.id)).toEqual(["dated", "undated"]);
  });
});
