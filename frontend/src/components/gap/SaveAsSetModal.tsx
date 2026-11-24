import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useBenchmarkSets } from "@/components/gap/useBenchmarkSets";
import type { BenchmarkSetItemIn } from "@/lib/benchmarkSetsApi";
import type { SkaterBenchmark } from "@/lib/types";

interface Props {
  benchmarks: SkaterBenchmark[];
  onClose: () => void;
  onSaved: () => void;
}

/** Map a skater's benchmarks to set items. SkaterBenchmark stores its title in
 *  the `name` field, so that becomes the set item's `title`. */
function toItems(benchmarks: SkaterBenchmark[]): BenchmarkSetItemIn[] {
  return benchmarks.map((b, idx) => ({
    category: b.category,
    title: b.name,
    notes: b.notes ?? null,
    sort_order: idx,
  }));
}

/** Save this skater's current benchmarks as a reusable, coach-owned set. */
export function SaveAsSetModal({ benchmarks, onClose, onSaved }: Props) {
  const { createSet } = useBenchmarkSets();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createSet({
        name: name.trim(),
        description: description.trim() || null,
        items: toItems(benchmarks),
      });
      onSaved();
      onClose();
    } catch {
      setError("Could not save this set. Please try again.");
      setSaving(false);
    }
  };

  const count = benchmarks.length;

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-set-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="save-set-title" className="text-base font-semibold text-slate-900">
          Save as Benchmark Set
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Saves {count} benchmark{count === 1 ? "" : "s"} from this skater as a
          reusable set you can apply to others.
        </p>

        {error ? (
          <Alert variant="danger" className="mt-4">
            {error}
          </Alert>
        ) : null}

        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="set-name">Set Name</Label>
            <Input
              id="set-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pre-Novice Core Targets"
              required
            />
          </div>
          <div>
            <Label htmlFor="set-description">Description</Label>
            <Input
              id="set-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            Save Set
          </Button>
        </div>
      </div>
    </div>
  );
}
