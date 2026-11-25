interface Props {
  elementCode: string;
  totalAttempts: number;
  withCallsCount: number;
  cleanPercentage: number;
  completedPercentage: number;
  tagCounts: Record<string, number>;
}

function topTags(tagCounts: Record<string, number>): [string, number][] {
  return Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4);
}

/** Two-tier element consistency: a stacked bar where emerald = truly clean and
 *  amber = completed-with-calls, plus the top technical call tags. Mirrors the
 *  backend split (clean vs with_calls) so completed% >= clean%. */
export function TwoTierConsistencyBar({
  elementCode,
  totalAttempts,
  withCallsCount,
  cleanPercentage,
  completedPercentage,
  tagCounts,
}: Props) {
  const amberWidth = Math.max(0, completedPercentage - cleanPercentage);
  const tags = topTags(tagCounts);
  return (
    <li className="py-2">
      <div className="flex items-center gap-3">
        <span className="w-16 shrink-0 font-mono text-sm font-semibold text-slate-900">
          {elementCode}
        </span>
        <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-emerald-500" style={{ width: `${cleanPercentage}%` }} />
          <div className="h-full bg-amber-400" style={{ width: `${amberWidth}%` }} />
        </div>
        <span className="w-12 shrink-0 text-right text-sm font-semibold text-slate-800">
          {completedPercentage}%
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 pl-[4.75rem]">
        <span className="text-[11px] text-slate-500 tabular-nums">
          {cleanPercentage}% clean · {withCallsCount} w/ calls · {totalAttempts} att
        </span>
        {tags.map(([tag, count]) => (
          <span
            key={tag}
            className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800"
          >
            {tag} ×{count}
          </span>
        ))}
      </div>
    </li>
  );
}
