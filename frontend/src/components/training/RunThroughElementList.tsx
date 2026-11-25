import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ATTEMPT_OUTCOMES, outcomeLabel } from "@/lib/trainingHelpers";

export interface RtElement {
  element_code: string;
  outcome: string;
}

interface Props {
  rows: RtElement[];
  onOutcome: (index: number, outcome: string) => void;
  onRemove: (index: number) => void;
  onAdd: (code: string) => void;
}

function ElementRow({
  row,
  onOutcome,
  onRemove,
}: {
  row: RtElement;
  onOutcome: (outcome: string) => void;
  onRemove: () => void;
}) {
  return (
    <li
      data-testid={`rt-el-${row.element_code}`}
      className="flex flex-wrap items-center gap-2 py-1.5"
    >
      <span className="w-16 shrink-0 font-mono text-sm font-semibold text-slate-900">
        {row.element_code}
      </span>
      <div className="flex flex-wrap gap-1">
        {ATTEMPT_OUTCOMES.map((o) => (
          <Button
            key={o}
            type="button"
            size="sm"
            variant={row.outcome === o ? "default" : "outline"}
            onClick={() => onOutcome(o)}
          >
            {outcomeLabel(o)}
          </Button>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label="remove element"
        className="ml-auto text-rose-600 hover:bg-rose-50"
        onClick={onRemove}
      >
        ✕
      </Button>
    </li>
  );
}

/** Editable list of run-through elements: each row is an element code with
 *  tap-only outcome pills (default clean) plus an ad-hoc "+ Add Element" row. */
export function RunThroughElementList({ rows, onOutcome, onRemove, onAdd }: Props) {
  const [code, setCode] = useState("");
  const add = () => {
    if (!code.trim()) return;
    onAdd(code.trim());
    setCode("");
  };
  return (
    <div>
      {rows.length === 0 ? (
        <p className="py-2 text-xs text-slate-400">
          Select a program above to load its planned elements.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <ElementRow
              key={`${r.element_code}-${i}`}
              row={r}
              onOutcome={(o) => onOutcome(i, o)}
              onRemove={() => onRemove(i)}
            />
          ))}
        </ul>
      )}
      <div className="mt-2 flex items-center gap-2">
        <Input
          className="w-28"
          placeholder="Element code..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Button type="button" size="sm" variant="outline" onClick={add}>
          + Add Element
        </Button>
      </div>
    </div>
  );
}
