import { Link } from "react-router-dom";
import { MapPin, Pencil } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCompDateRange } from "@/lib/calendarHelpers";
import type {
  RosterCompetitionOut,
  RosterEntrySummaryOut,
} from "@/lib/competitionScheduleApi";

function EntryRow({ entry }: { entry: RosterEntrySummaryOut }) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
      <Link
        to={`/skaters/${entry.skater_id}`}
        className="font-medium text-blue-700 hover:underline"
      >
        {entry.skater_name}
      </Link>
      {entry.level && (
        <Badge variant="default" className="border border-slate-200">
          {entry.level}
        </Badge>
      )}
      {entry.status && (
        <Badge variant="primary" className="capitalize">
          {entry.status}
        </Badge>
      )}
      {entry.overall_score != null && (
        <span className="ml-auto font-semibold text-slate-900">
          {entry.overall_score.toFixed(2)}
        </span>
      )}
    </li>
  );
}

/** Detail card for a single competition: date range, location and its roster.
 *  When onEdit is supplied, a compact Edit button is shown in the header. */
export function CompetitionScheduleCard({
  competition,
  onEdit,
}: {
  competition: RosterCompetitionOut;
  onEdit?: (comp: RosterCompetitionOut) => void;
}) {
  return (
    <Card data-testid="competition-detail">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-lg font-semibold text-slate-900">
            {competition.name}
          </CardTitle>
          <p className="text-sm text-slate-500">
            {formatCompDateRange(competition.start_date, competition.end_date)}
          </p>
          {competition.location && (
            <p className="flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {competition.location}
            </p>
          )}
        </div>
        {onEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Edit ${competition.name}`}
            onClick={() => onEdit(competition)}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
          </Button>
        )}
      </CardHeader>
      <div className="p-4 pt-0">
        {competition.entries.length === 0 ? (
          <p className="text-sm text-slate-400">No skaters entered.</p>
        ) : (
          <ul className="space-y-1.5">
            {competition.entries.map((e) => (
              <EntryRow key={e.entry_id} entry={e} />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
