import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import type {
  CompetitionUpdate,
  RosterCompetitionOut,
} from "@/lib/competitionScheduleApi";

interface Props {
  competition: RosterCompetitionOut;
  onSave: (id: string, payload: CompetitionUpdate) => Promise<void>;
  onClose: () => void;
}

const FIELD =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm " +
  "text-slate-900 focus:border-slate-500 focus:outline-none";

function emptyToNull(value: string): string | null {
  return value.trim() ? value.trim() : null;
}

/** Coaches edit a competition's name, dates and city/country. Pre-populated from
 *  the selected row; blocks submit when end_date precedes start_date. */
export function EditCompetitionModal({ competition, onSave, onClose }: Props) {
  const [name, setName] = useState(competition.name);
  const [startDate, setStartDate] = useState(competition.start_date ?? "");
  const [endDate, setEndDate] = useState(competition.end_date ?? "");
  const [city, setCity] = useState(competition.city ?? "");
  const [country, setCountry] = useState(competition.country ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateError =
    startDate && endDate && endDate < startDate
      ? "End date must be on or after the start date."
      : null;

  const handleSave = async () => {
    if (!name.trim() || dateError) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(competition.id, {
        name: name.trim(),
        start_date: emptyToNull(startDate),
        end_date: emptyToNull(endDate),
        city: emptyToNull(city),
        country: emptyToNull(country),
      });
      onClose();
    } catch {
      setError("Could not save changes. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-competition-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="edit-competition-title" className="text-base font-semibold text-slate-900">
          Edit Competition
        </h2>

        {error ? (
          <Alert variant="danger" className="mt-4">
            {error}
          </Alert>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Name
            <input className={FIELD} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Start Date
            <input
              type="date"
              aria-label="Start Date"
              className={FIELD}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            End Date
            <input
              type="date"
              aria-label="End Date"
              className={FIELD}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            City
            <input className={FIELD} value={city} onChange={(e) => setCity(e.target.value)} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Country
            <input
              className={FIELD}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </label>
        </div>

        {dateError ? (
          <p role="alert" className="mt-3 text-sm text-rose-600">
            {dateError}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim() || !!dateError}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
