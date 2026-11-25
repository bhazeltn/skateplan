import { http, HttpResponse } from "msw";
import type { RosterCompetitionOut } from "@/lib/competitionScheduleApi";

// Stateless mock for GET /api/competitions/roster-schedule. Seeds a realistic
// mix: an upcoming multi-day competition with several skaters, a past one with
// scores recorded, a single-skater event, and an entry-less catalog comp that
// only surfaces when include_empty=true. Dates are relative to late Nov 2026.

const AVA = { entry_id: "e-ava", skater_id: 1, skater_name: "Ava Nguyen" };
const LIAM = { entry_id: "e-liam", skater_id: 2, skater_name: "Liam Torres" };
const MIA = { entry_id: "e-mia", skater_id: 3, skater_name: "Mia Chen" };

export const mockRosterSchedule: RosterCompetitionOut[] = [
  {
    id: "comp-winter",
    name: "Winter Nationals",
    start_date: "2026-12-11",
    end_date: "2026-12-13",
    location: "Calgary, Canada",
    entries: [
      { ...LIAM, level: "Junior", status: "confirmed", overall_score: null },
      { ...AVA, level: "Senior", status: "confirmed", overall_score: null },
    ],
  },
  {
    id: "comp-autumn",
    name: "Autumn Classic",
    start_date: "2026-10-02",
    end_date: "2026-10-04",
    location: "Toronto, Canada",
    entries: [
      { ...AVA, level: "Senior", status: "completed", overall_score: 198.45 },
      { ...LIAM, level: "Junior", status: "completed", overall_score: 172.3 },
    ],
  },
  {
    id: "comp-spring",
    name: "Spring Invitational",
    start_date: "2027-03-07",
    end_date: null,
    location: "Vancouver, Canada",
    entries: [{ ...MIA, level: "Novice", status: "prospective", overall_score: null }],
  },
];

// Catalog competition with no (authorized) entries — only via include_empty.
const emptyComp: RosterCompetitionOut = {
  id: "comp-prospects",
  name: "Prospects Camp",
  start_date: "2027-01-20",
  end_date: "2027-01-22",
  location: "Montreal, Canada",
  entries: [],
};

function narrowToSkater(
  items: RosterCompetitionOut[],
  skaterId: number
): RosterCompetitionOut[] {
  return items
    .map((c) => ({ ...c, entries: c.entries.filter((e) => e.skater_id === skaterId) }))
    .filter((c) => c.entries.length > 0);
}

export const competitionScheduleHandlers = [
  http.get("*/api/competitions/roster-schedule", ({ request }) => {
    const url = new URL(request.url);
    const includeEmpty = url.searchParams.get("include_empty") === "true";
    const skaterParam = url.searchParams.get("skater_id");
    let items: RosterCompetitionOut[] = mockRosterSchedule.map((c) => ({
      ...c,
      entries: [...c.entries],
    }));
    if (includeEmpty) items = [...items, { ...emptyComp }];
    if (skaterParam != null) items = narrowToSkater(items, Number(skaterParam));
    return HttpResponse.json(items);
  }),
];
