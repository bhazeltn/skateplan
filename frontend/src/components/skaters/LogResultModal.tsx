import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/input";
import type { ResultPayload, ResultUpdate, SegmentResultOut } from "@/lib/types";

interface Props {
  entryId: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (entryId: string, payload: ResultPayload) => Promise<void> | void;
  initialResult?: SegmentResultOut;
  fixedSegment?: "SP" | "FS";
  onUpdate?: (resultId: string, payload: ResultUpdate) => Promise<void> | void;
  onDelete?: (resultId: string) => Promise<void> | void;
}

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 " +
  "text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-slate-100";

const num = (v: string) => (v === "" ? 0 : Number(v));
const intOrNull = (v: string) => (v === "" ? null : Number(v));
const str = (v?: number | null) => (v == null ? "" : String(v));

export function LogResultModal({
  entryId,
  open,
  onClose,
  onSubmit,
  initialResult,
  fixedSegment,
  onUpdate,
  onDelete,
}: Props) {
  const editing = Boolean(initialResult);
  const [segment, setSegment] = useState("SP");
  const [tes, setTes] = useState("");
  const [pcs, setPcs] = useState("");
  const [bonus, setBonus] = useState("");
  const [deductions, setDeductions] = useState("");
  const [overall, setOverall] = useState("");
  const [segRank, setSegRank] = useState("");

  useEffect(() => {
    if (!open) return;
    const r = initialResult;
    setSegment(fixedSegment ?? r?.segment ?? "SP");
    setTes(str(r?.tes));
    setPcs(str(r?.pcs));
    setBonus(str(r?.segment_bonus));
    setDeductions(str(r?.deductions));
    setOverall(str(r?.overall_rank));
    setSegRank(str(r?.segment_rank));
  }, [open, initialResult, fixedSegment]);

  if (!open) return null;

  const tss = num(tes) + num(pcs) + num(bonus) - num(deductions);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      segment,
      tes: num(tes),
      pcs: num(pcs),
      segment_bonus: num(bonus),
      deductions: num(deductions),
      overall_rank: intOrNull(overall),
      segment_rank: intOrNull(segRank),
    };
    if (editing && initialResult && onUpdate) {
      await onUpdate(initialResult.id, payload);
    } else {
      await onSubmit(entryId, payload);
    }
    onClose();
  }

  async function handleDelete() {
    if (!initialResult || !onDelete) return;
    if (!window.confirm("Delete this result? This cannot be undone.")) return;
    await onDelete(initialResult.id);
    onClose();
  }

  return (
    <div role="presentation" onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="log-result-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 id="log-result-title" className="mb-4 text-lg font-semibold text-slate-900">
          {editing ? "Edit Result" : "Log Result"}
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="result-segment">Segment</Label>
            <select id="result-segment" value={segment} className={SELECT_CLASS}
              disabled={Boolean(fixedSegment) || editing}
              onChange={(e) => setSegment(e.target.value)}>
              <option value="SP">Short Program</option>
              <option value="FS">Free Skate</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="result-tes" label="TES" type="number" value={tes}
              onChange={(e) => setTes(e.target.value)} />
            <Field id="result-pcs" label="PCS" type="number" value={pcs}
              onChange={(e) => setPcs(e.target.value)} />
            <Field id="result-bonus" label="Bonus" type="number" value={bonus}
              onChange={(e) => setBonus(e.target.value)} />
            <Field id="result-ded" label="Deductions" type="number" value={deductions}
              onChange={(e) => setDeductions(e.target.value)} />
            <Field id="result-overall" label="Overall Rank" type="number" value={overall}
              onChange={(e) => setOverall(e.target.value)} />
            <Field id="result-segrank" label="Seg. Rank" type="number" value={segRank}
              onChange={(e) => setSegRank(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
            <span className="text-sm font-medium text-slate-600">Total Segment Score</span>
            <span data-testid="tss-value"
              className="tabular-nums text-lg font-semibold text-slate-900">
              {tss.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 pt-2">
            {editing ? (
              <button type="button" onClick={handleDelete}
                className="rounded-md border border-red-200 px-3 py-2 text-sm
                  font-medium text-red-600 hover:bg-red-50">
                Delete Result
              </button>
            ) : (
              <button type="button" disabled title="Coming in next sprint"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm
                  font-medium text-slate-400 cursor-not-allowed">
                Upload Detail Sheet (PDF)
              </button>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">{editing ? "Update Result" : "Save Result"}</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
