import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { BENCHMARK_CATEGORIES } from "@/components/gap/gapScoring";
import type {
  BenchmarkSetItemIn,
  BenchmarkSetOut,
} from "@/lib/benchmarkSetsApi";

interface ItemDraft {
  category: string;
  title: string;
  notes: string;
}

interface Props {
  initial?: BenchmarkSetOut;
  onSave: (payload: {
    name: string;
    description: string | null;
    items: BenchmarkSetItemIn[];
  }) => Promise<void>;
  onCancel: () => void;
}

function draftFrom(initial?: BenchmarkSetOut): ItemDraft[] {
  if (!initial) return [];
  return initial.items.map((i) => ({
    category: i.category,
    title: i.title,
    notes: i.notes ?? "",
  }));
}

/** One editable item row: category (with suggestions), title and notes. */
function ItemRow({
  index,
  item,
  onChange,
  onRemove,
}: {
  index: number;
  item: ItemDraft;
  onChange: (patch: Partial<ItemDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto]">
      <label className="text-xs font-medium text-slate-600">
        Category
        <Input
          list="bset-categories"
          aria-label={`Item ${index + 1} category`}
          value={item.category}
          onChange={(e) => onChange({ category: e.target.value })}
        />
      </label>
      <label className="text-xs font-medium text-slate-600">
        Title
        <Input
          aria-label={`Item ${index + 1} title`}
          value={item.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </label>
      <div className="flex items-end">
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>
      <label className="text-xs font-medium text-slate-600 sm:col-span-3">
        Notes
        <Input
          aria-label={`Item ${index + 1} notes`}
          value={item.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </label>
    </div>
  );
}

/** Create / edit form for a coach benchmark set with dynamic item rows. */
export function BenchmarkSetForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [items, setItems] = useState<ItemDraft[]>(draftFrom(initial));
  const [saving, setSaving] = useState(false);

  const patchItem = (idx: number, patch: Partial<ItemDraft>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const addItem = () =>
    setItems((prev) => [...prev, { category: "", title: "", notes: "" }]);

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      items: items
        .filter((it) => it.title.trim())
        .map((it, idx) => ({
          category: it.category.trim() || "General",
          title: it.title.trim(),
          notes: it.notes.trim() || null,
          sort_order: idx,
        })),
    };
    try {
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <datalist id="bset-categories">
        {BENCHMARK_CATEGORIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div>
        <Label htmlFor="bset-name">Set Name</Label>
        <Input
          id="bset-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Pre-Novice Core Targets"
          required
        />
      </div>
      <div>
        <Label htmlFor="bset-desc">Description</Label>
        <Input
          id="bset-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <ItemRow
            key={idx}
            index={idx}
            item={item}
            onChange={(patch) => patchItem(idx, patch)}
            onRemove={() => removeItem(idx)}
          />
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          + Add Item
        </Button>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving || !name.trim()}>
          Save Set
        </Button>
      </div>
    </div>
  );
}
