import { useEffect, useState, type FormEvent } from "react";
import { searchCompetitions, createCompetition } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { CompetitionOut, CompetitionPayload } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/input";
import { LocationPicker } from "@/components/skaters/LocationPicker";

interface Props {
  value: CompetitionOut | null;
  onSelect: (comp: CompetitionOut) => void;
  onClear: () => void;
}

const EMPTY: CompetitionPayload = {
  name: "",
  start_date: "",
  end_date: "",
  city: "",
};

/** Debounced async search over the global competition list. */
function useCompetitionSearch(query: string): CompetitionOut[] {
  const { token } = useAuth();
  const [results, setResults] = useState<CompetitionOut[]>([]);
  useEffect(() => {
    let active = true;
    searchCompetitions(query, token)
      .then((r) => active && setResults(r))
      .catch(() => active && setResults([]));
    return () => {
      active = false;
    };
  }, [query, token]);
  return results;
}

function CreateCompetitionForm({
  name,
  onCreated,
  onCancel,
}: {
  name: string;
  onCreated: (c: CompetitionOut) => void;
  onCancel: () => void;
}) {
  const { token } = useAuth();
  const [form, setForm] = useState<CompetitionPayload>({ ...EMPTY, name });
  const set = (k: keyof CompetitionPayload, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreated(await createCompetition({ ...form, name }, token));
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md bg-slate-50 p-3">
      <div>
        <Label htmlFor="comp-name">Name</Label>
        <p id="comp-name" className="rounded-md border border-slate-200 bg-white
          px-3 py-2 text-sm font-medium text-slate-900">
          {name || "— type a name in the search box above —"}
        </p>
      </div>
      <Field id="comp-start" label="Start Date" type="date"
        value={form.start_date ?? ""} onChange={(e) => set("start_date", e.target.value)} />
      <Field id="comp-end" label="End Date" type="date"
        value={form.end_date ?? ""} onChange={(e) => set("end_date", e.target.value)} />
      <LocationPicker city={form.city ?? ""}
        onCountry={(v) => set("country", v)} onCity={(v) => set("city", v)} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Competition</Button>
      </div>
    </form>
  );
}

function ResultList({
  results,
  onSelect,
}: {
  results: CompetitionOut[];
  onSelect: (c: CompetitionOut) => void;
}) {
  if (results.length === 0) {
    return <p className="px-1 text-xs text-slate-400">No competitions match.</p>;
  }
  return (
    <ul data-testid="competition-results" className="max-h-40 divide-y
      divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
      {results.map((c) => (
        <li key={c.id}>
          <button type="button" onClick={() => onSelect(c)}
            className="flex w-full items-center justify-between px-3 py-2 text-left
              text-sm text-slate-700 hover:bg-slate-50">
            <span>{c.name}</span>
            <span className="tabular-nums text-xs text-slate-400">{c.start_date}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CompetitionSelector({ value, onSelect, onClear }: Props) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const results = useCompetitionSearch(query);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border
        border-slate-200 px-3 py-2">
        <span className="text-sm font-medium text-slate-900">{value.name}</span>
        <button type="button" onClick={onClear}
          className="text-xs font-semibold text-slate-500 hover:text-slate-700">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="competition-search">Competition</Label>
      <input id="competition-search" type="text" value={query} autoComplete="off"
        placeholder="Search competitions…" onChange={(e) => setQuery(e.target.value)}
        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3
          py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-ring" />
      {!creating && <ResultList results={results} onSelect={onSelect} />}
      {creating ? (
        <CreateCompetitionForm name={query} onCreated={onSelect}
          onCancel={() => setCreating(false)} />
      ) : (
        <button type="button" onClick={() => setCreating(true)}
          className="text-sm font-semibold text-slate-900 hover:underline">
          + Create New Competition
        </button>
      )}
    </div>
  );
}
