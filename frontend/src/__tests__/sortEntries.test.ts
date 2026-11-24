import { describe, expect, it } from "vitest";
import { sortCompetitionEntries } from "@/lib/sortEntries";

/** Mirrors the structural shape CompetitionsTab maps over (JoinedEntry):
 *  { entry: { id }, competition?: { name, start_date } }. */
interface E {
  entry: { id: string };
  competition?: { name?: string | null; start_date?: string | null } | null;
}

function e(id: string, start_date: string | null | undefined, name = `Comp ${id}`): E {
  return { entry: { id }, competition: { name, start_date } };
}

const TODAY = "2026-12-01";
const ids = (list: E[]) => list.map((r) => r.entry.id);

describe("sortCompetitionEntries", () => {
  it("places upcoming entries before past entries", () => {
    const result = sortCompetitionEntries([e("p", "2025-11-06"), e("u", "2027-01-15")], TODAY);
    expect(ids(result)).toEqual(["u", "p"]);
  });

  it("sorts multiple upcoming entries ascending (soonest first)", () => {
    const result = sortCompetitionEntries([e("a", "2027-03-10"), e("b", "2027-01-15")], TODAY);
    expect(ids(result)).toEqual(["b", "a"]);
  });

  it("sorts multiple past entries descending (most recent first)", () => {
    const result = sortCompetitionEntries(
      [e("a", "2025-11-06"), e("b", "2026-11-19"), e("c", "2026-03-11")],
      TODAY
    );
    expect(ids(result)).toEqual(["b", "c", "a"]);
  });

  it("treats an entry dated exactly today as upcoming", () => {
    const result = sortCompetitionEntries([e("p", "2026-01-01"), e("t", TODAY)], TODAY);
    expect(ids(result)).toEqual(["t", "p"]);
  });

  it("produces the full upcoming-then-past ordering", () => {
    const input = [
      e("past-old", "2025-11-06"),
      e("up-late", "2027-03-10"),
      e("past-recent", "2026-11-19"),
      e("up-soon", "2027-01-15"),
      e("past-mid", "2026-03-11"),
    ];
    const result = sortCompetitionEntries(input, TODAY);
    expect(ids(result)).toEqual([
      "up-soon", "up-late", "past-recent", "past-mid", "past-old",
    ]);
  });

  it("does not mutate the original input array", () => {
    const input = [e("p", "2025-11-06"), e("u", "2027-01-15"), e("m", null)];
    const snapshot = ids(input);
    const result = sortCompetitionEntries(input, TODAY);
    expect(ids(input)).toEqual(snapshot); // original order preserved
    expect(result).not.toBe(input); // a new array was returned
  });

  it("places entries with missing/empty start_date at the end", () => {
    const withDate = e("d", "2027-01-15");
    const missing = e("m", null);
    const empty = e("x", "");
    const undef: E = { entry: { id: "u" }, competition: { name: "Comp u" } };
    const result = sortCompetitionEntries([missing, withDate, empty, undef], TODAY);
    expect(result[0].entry.id).toBe("d");
    // dateless go last, ordered by the name/id tiebreaker (all "Comp <id>")
    expect(ids(result).slice(1)).toEqual(["m", "u", "x"]);
  });

  it("breaks ties on equal start_date by competition name (split-level STAR 7/8)", () => {
    const star8 = e("s8", "2027-01-15", "STAR 8 Short");
    const star7 = e("s7", "2027-01-15", "STAR 7 Short");
    const result = sortCompetitionEntries([star8, star7], TODAY);
    expect(ids(result)).toEqual(["s7", "s8"]);
  });

  it("falls back to entry id when names are equal on the same date", () => {
    const b: E = { entry: { id: "b" }, competition: { name: "Same", start_date: "2027-01-15" } };
    const a: E = { entry: { id: "a" }, competition: { name: "Same", start_date: "2027-01-15" } };
    const result = sortCompetitionEntries([b, a], TODAY);
    expect(ids(result)).toEqual(["a", "b"]);
  });

  it("defaults todayIso to the current date when omitted", () => {
    const result = sortCompetitionEntries([e("o", "2000-01-01"), e("f", "2999-01-01")]);
    expect(ids(result)).toEqual(["f", "o"]);
  });
});
