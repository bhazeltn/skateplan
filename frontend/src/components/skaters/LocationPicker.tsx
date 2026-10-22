import { useMemo, useState } from "react";
import { Country, State, City } from "country-state-city";
import { Label } from "@/components/ui/input";

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 " +
  "text-sm text-slate-900 tabular-nums focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-ring";

interface Option {
  isoCode: string;
  name: string;
}

/** A labelled native select over ISO-coded geographic options. */
function GeoSelect({
  id,
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Option[];
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select id={id} value={value} className={SELECT_CLASS}
        onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.isoCode} value={o.isoCode}>{o.name}</option>
        ))}
      </select>
    </div>
  );
}

interface Props {
  city: string;
  onCountry: (name: string) => void;
  onCity: (name: string) => void;
}

/**
 * Geographic location picker backed by the `country-state-city` dataset:
 * Country -> Region/State -> City (datalist-assisted free entry). Deterministic,
 * no network calls. Emits the human-readable country name and city string.
 */
export function LocationPicker({ city, onCountry, onCity }: Props) {
  const countries = useMemo(() => Country.getAllCountries(), []);
  const [iso, setIso] = useState("");
  const [stateIso, setStateIso] = useState("");
  const states = useMemo(
    () => (iso ? State.getStatesOfCountry(iso) : []),
    [iso]
  );
  const cities = useMemo(() => {
    const list = iso && stateIso
      ? City.getCitiesOfState(iso, stateIso)
      : iso ? City.getCitiesOfCountry(iso) : [];
    return (list ?? []).slice(0, 500);
  }, [iso, stateIso]);

  function pickCountry(code: string) {
    setIso(code);
    setStateIso("");
    const match = countries.find((c) => c.isoCode === code);
    onCountry(match ? match.name : "");
  }

  return (
    <div className="space-y-3">
      <GeoSelect id="comp-country" label="Country" value={iso}
        options={countries} placeholder="— Select country —"
        onChange={pickCountry} />
      <GeoSelect id="comp-region" label="Region / State" value={stateIso}
        options={states} placeholder="— Select region —"
        onChange={setStateIso} />
      <div>
        <Label htmlFor="comp-city">City</Label>
        <input id="comp-city" list="comp-city-list" value={city}
          autoComplete="off" placeholder="City" className={SELECT_CLASS}
          onChange={(e) => onCity(e.target.value)} />
        <datalist id="comp-city-list">
          {cities.map((c) => (
            <option key={`${c.name}-${c.stateCode}`} value={c.name} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
