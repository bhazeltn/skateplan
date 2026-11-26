import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ProfileTab {
  label: string;
  content: ReactNode;
}

/** Lightweight accessible tab strip for the profile hub. An optional
 *  `initialLabel` selects which tab is active on first render. */
export function ProfileTabs({
  tabs,
  initialLabel,
}: {
  tabs: ProfileTab[];
  initialLabel?: string;
}) {
  const initialIndex = Math.max(
    0,
    tabs.findIndex((t) => t.label === initialLabel)
  );
  const [active, setActive] = useState(initialIndex);
  return (
    <div className="space-y-4">
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            role="tab"
            type="button"
            aria-selected={active === index}
            onClick={() => setActive(index)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              active === index
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{tabs[active]?.content}</div>
    </div>
  );
}
