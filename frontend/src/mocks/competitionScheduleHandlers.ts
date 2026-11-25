import { http, HttpResponse } from "msw";
import type { RosterCompetitionOut } from "@/lib/competitionScheduleApi";

// Stateful mock for the roster-schedule read + competition PATCH. Seeds a
// realistic mix: an upcoming multi-day competition with several skaters, a past
// one with scores, a single-skater event, and an entry-less catalog comp that
// only surfaces when include_empty=true. Reset via resetCompetitionScheduleStore().

const AVA = { entry_id: "e-ava", skater_id: 1, skater_name: "Ava Nguyen" };
const LIAM = { entry_id: "e-liam", skater_id: 2, skater_name: "Liam Torres" };
const MIA = { entry_id: "e-mia", skater_id: 3, skater_name: "Mia Chen" };

const SEED: RosterCompetitionOut[] = [
  {
    id: "comp-winter",
    name: "Winter Nationals",
    start_date: "2026-12-11",
    end_date: "2026-12-13",
    city: "Calgary",
    country: "Canada",
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
    city: "Toronto",
    country: "Canada",
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
    city: "Vancouver",
    country: "Canada",
    location: "Vancouver, Canada",
    entries: [{ ...MIA, level: "Novice", status: "prospective", overall_score: null }],
  },
];

// Catalog competition with no (authorized) entries — only via include_empty.
const EMPTY_SEED: RosterCompetitionOut = {
  id: "comp-prospects",
  name: "Prospects Camp",
  start_date: "2027-01-20",
  end_date: "2027-01-22",
  city: "Montreal",
  country: "Canada",
  location: "Montreal, Canada",
  entries: [],
};

let store: RosterCompetitionOut[] = [];
let emptyComp: RosterCompetitionOut = structuredClone(EMPTY_SEED);

export function resetCompetitionScheduleStore(): void {
  store = structuredClone(SEED);
  emptyComp = structuredClone(EMPTY_SEED);
}
resetCompetitionScheduleStore();

// Back-compat named export used by any importer expecting the raw seed list.
export const mockRosterSchedule = SEED;

function narrowToSkater(
  items: RosterCompetitionOut[],
  skaterId: number
): RosterCompetitionOut[] {
  return items
    .map((c) => ({ ...c, entries: c.entries.filter((e) => e.skater_id === skaterId) }))
    .filter((c) => c.entries.length > 0);
}

function deriveLocation(city?: string | null, country?: string | null): string | null {
  return [city, country].filter(Boolean).join(", ") || null;
}

export const competitionScheduleHandlers = [
  http.get("*/api/competitions/roster-schedule", ({ request }) => {
    const url = new URL(request.url);
    const includeEmpty = url.searchParams.get("include_empty") === "true";
    const skaterParam = url.searchParams.get("skater_id");
    let items = structuredClone(store);
    if (includeEmpty) items = [...items, structuredClone(emptyComp)];
    if (skaterParam != null) items = narrowToSkater(items, Number(skaterParam));
    return HttpResponse.json(items);
  }),
  http.patch("*/api/competitions/:id", async ({ params, request }) => {
    const body = (await request.json()) as Partial<RosterCompetitionOut>;
    const comp = store.find((c) => c.id === params.id);
    if (!comp) return new HttpResponse(null, { status: 404 });
    Object.assign(comp, body);
    comp.location = deriveLocation(comp.city, comp.country);
    return HttpResponse.json(comp);
  }),
];
