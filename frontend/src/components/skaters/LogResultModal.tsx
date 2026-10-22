import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/input";
import type { ResultPayload } from "@/lib/types";

interface Props {
  entryId: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (entryId: string, payload: ResultPayload) => Promise<void> | void;
}

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 " +
  "text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-ring";

const num = (v: string) => (v === "" ? 0 : Number(v));
const intOrNull = (v: string) => (v === "" ? null : Number(v));

export function LogResultModal({ entryId, open, onClose, onSubmit }: Props) {
  const [segment, setSegment] = useState("SP");
  const [tes, setTes] = useState("");
  const [pcs, setPcs] = useState("");
  const [bonus, setBonus] = useState("");
  const [deductions, setDeductions] = useState("");
  const [overall, setOverall] = useState("");
  const [segRank, setSegRank] = useState("");

  if (!open) return null;

  const tss = num(tes) + num(pcs) + num(bonus) - num(deductions);

  async function submit(e: FormEvent) {
    e.preventDefault();
    await onSubmit(entryId, {
      segment,
      tes: num(tes),
      pcs: num(pcs),
      segment_bonus: num(bonus),
      deductions: num(deductions),
      overall_rank: intOrNull(overall),
      segment_rank: intOrNull(segRank),
    });
    onClose();
  }

  return (
    <div role="presentation" onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="log-result-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 id="log-result-title" className="mb-4 text-lg font-semibold text-slate-900">
          Log Result
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="result-segment">Segment</Label>
            <select id="result-segment" value={segment} className={SELECT_CLASS}
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
            <button type="button" disabled title="Coming in next sprint"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm
                font-medium text-slate-400 cursor-not-allowed">
              Upload Detail Sheet (PDF)
            </button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">Save Result</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
