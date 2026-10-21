import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  createProgram,
  listSovElements,
  updateProgramElements,
  updateProgramMeta,
} from "@/lib/api";
import type { SovElement } from "@/lib/types";
import { toCatalog, totalBaseValue, type PlannedElement } from "@/lib/sov";
import { ElementSearch } from "@/components/programs/ElementSearch";
import { ElementSlots } from "@/components/programs/ElementSlots";
import { TotalBar } from "@/components/programs/TotalBar";

type Segment = "SP" | "FS";
const TITLES: Record<Segment, string> = { SP: "Short Program", FS: "Free Skate" };

export interface InitialProgramData {
  id: string;
  program_type: Segment;
  title: string;
  elements: PlannedElement[];
}

export function ProgramBuilder({
  skaterId,
  initialProgram,
  onSaved,
  onCancel,
}: {
  skaterId: number;
  initialProgram?: InitialProgramData | null;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const { token } = useAuth();
  const [sov, setSov] = useState<SovElement[]>([]);
  const [segment, setSegment] = useState<Segment>(
    initialProgram?.program_type ?? "SP"
  );
  const [elements, setElements] = useState<PlannedElement[]>(
    initialProgram?.elements ?? []
  );
  const [title, setTitle] = useState(initialProgram?.title ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    listSovElements(token, true)
      .then((rows) => active && setSov(rows))
      .catch(() => active && setSov([]));
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (initialProgram) {
      setSegment(initialProgram.program_type);
      setElements(initialProgram.elements);
      setTitle(initialProgram.title);
    }
  }, [initialProgram]);

  const catalog = useMemo(() => toCatalog(sov), [sov]);
  const total = totalBaseValue(elements, catalog);

  function addElement(code: string) {
    setElements((prev) => [...prev, { element_code: code, is_second_half_bonus: false }]);
  }
  function toggle(index: number) {
    setElements((prev) =>
      prev.map((el, i) =>
        i === index ? { ...el, is_second_half_bonus: !el.is_second_half_bonus } : el
      )
    );
  }
  function remove(index: number) {
    setElements((prev) => prev.filter((_, i) => i !== index));
  }
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    setElements((prev) => {
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const payloadElements = elements.map((el, i) => ({
        segment_order: i + 1,
        element_code: el.element_code,
        is_second_half_bonus: el.is_second_half_bonus,
      }));

      if (initialProgram?.id) {
        // 1. Update the layout
        await updateProgramElements(initialProgram.id, payloadElements, token);
        
        // 2. Update the title if it was changed
        const trimmedTitle = title.trim();
        if (trimmedTitle && trimmedTitle !== initialProgram.title) {
          await updateProgramMeta(initialProgram.id, { title: trimmedTitle }, token);
        }
      } else {
        await createProgram(
          {
            skater_id: skaterId,
            program_type: segment,
            title: title.trim() || TITLES[segment],
            program_elements: payloadElements,
          },
          token
        );
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">
          {initialProgram ? `Edit ${initialProgram.title}` : "New Program Layout"}
        </h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        )}
      </div>

      {!initialProgram && (
        <SegmentSelector segment={segment} onChange={setSegment} />
      )}

      <div className="space-y-1">
        <label
          htmlFor="program-title"
          className="text-sm font-medium text-slate-600"
        >
          Program title
        </label>
        <input
          id="program-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={TITLES[segment]}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm
            text-slate-900 focus:border-slate-500 focus:outline-none"
        />
      </div>

      <ElementSearch elements={sov} onAdd={addElement} />
      <ElementSlots
        elements={elements}
        catalog={catalog}
        onToggle={toggle}
        onRemove={remove}
        onMove={move}
      />
      <TotalBar total={total} />
      <button
        type="button"
        onClick={save}
        disabled={saving || elements.length === 0}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold
          text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {saving ? "Saving…" : initialProgram ? "Update Elements" : "Save Program"}
      </button>
    </section>
  );
}

function SegmentSelector({
  segment,
  onChange,
}: {
  segment: Segment;
  onChange: (s: Segment) => void;
}) {
  return (
    <fieldset className="flex gap-4">
      <legend className="mb-2 text-sm font-medium text-slate-600">Segment</legend>
      {(Object.keys(TITLES) as Segment[]).map((key) => (
        <label key={key} className="flex items-center gap-2 text-sm text-slate-800">
          <input
            type="radio"
            name="segment"
            checked={segment === key}
            onChange={() => onChange(key)}
          />
          {TITLES[key]}
        </label>
      ))}
    </fieldset>
  );
}
