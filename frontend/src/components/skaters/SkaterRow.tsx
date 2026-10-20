import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import type { DashboardAlert, Skater } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { flagEmoji } from "@/lib/flags";
import { ProgramChips } from "./ProgramChips";

function initials(s: Skater): string {
  return `${s.first_name[0] ?? ""}${s.last_name[0] ?? ""}`.toUpperCase();
}

function isRestricted(s: Skater): boolean {
  return (s.restrictions?.length ?? 0) > 0 || Boolean(s.has_active_restriction);
}

function IdentityCell({ skater }: { skater: Skater }) {
  return (
    <td className="px-3 py-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600"
        >
          {initials(skater)}
        </span>
        <div className="min-w-0">
          <Link
            to={`/skaters/${skater.skater_id}`}
            className="font-medium text-slate-900 hover:text-blue-700"
          >
            {skater.first_name} {skater.last_name}
          </Link>
          {skater.home_club && (
            <p className="truncate text-xs text-slate-500">{skater.home_club}</p>
          )}
        </div>
      </div>
    </td>
  );
}

function FederationCell({ skater }: { skater: Skater }) {
  const level = skater.competitive_level ?? skater.level_name;
  return (
    <td className="px-3 py-3 text-sm text-slate-700">
      <div className="flex items-center gap-1.5">
        <span aria-hidden="true">{flagEmoji(skater.country_code)}</span>
        <span className="truncate">{skater.federation_name ?? "—"}</span>
      </div>
      {level && (
        <p className="text-xs font-medium tabular-nums text-slate-500">{level}</p>
      )}
    </td>
  );
}

function StatusCell({
  skater,
  alerts,
}: {
  skater: Skater;
  alerts: DashboardAlert[];
}) {
  const restricted = isRestricted(skater);
  return (
    <td className="px-3 py-3">
      <div className="flex flex-col items-start gap-1">
        {restricted && (
          <Badge variant="danger" className="gap-1">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Active Restriction
          </Badge>
        )}
        {alerts.map((a, i) => (
          <Badge key={i} variant="warning">
            {a.message}
          </Badge>
        ))}
        {!restricted && alerts.length === 0 && (
          <span className="text-xs text-slate-400">No alerts</span>
        )}
      </div>
    </td>
  );
}

export function SkaterRow({
  skater,
  alerts,
}: {
  skater: Skater;
  alerts: DashboardAlert[];
}) {
  return (
    <tr
      data-testid={`skater-row-${skater.skater_id}`}
      className="border-t border-slate-200 align-top hover:bg-slate-50"
    >
      <IdentityCell skater={skater} />
      <FederationCell skater={skater} />
      <td className="px-3 py-3 text-sm tabular-nums text-slate-400">—</td>
      <td className="px-3 py-3">
        <ProgramChips programs={skater.programs} />
      </td>
      <StatusCell skater={skater} alerts={alerts} />
      <td className="px-3 py-3">
        <Link to={`/skaters/${skater.skater_id}`}>
          <Button variant="outline" size="sm">
            View Profile
          </Button>
        </Link>
      </td>
    </tr>
  );
}
