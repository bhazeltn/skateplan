import { useState, type FormEvent } from "react";
import { updateSkater } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { FederationCombobox } from "./FederationCombobox";
import { LEVELS } from "./skaterForm";
import type { Federation, SkaterDetail, SkaterUpdatePayload } from "@/lib/types";

interface EditFields {
  full_name: string;
  competitive_level: string;
  contact_email: string;
  date_of_birth: string;
  home_club: string;
}

interface ModalProps {
  open: boolean;
  skater: SkaterDetail;
  onClose: () => void;
  onSaved: (updated: SkaterDetail) => void;
}

function initialFields(s: SkaterDetail): EditFields {
  return {
    full_name: [s.first_name, s.last_name].filter(Boolean).join(" "),
    competitive_level: s.competitive_level ?? "",
    contact_email: "",
    date_of_birth: "",
    home_club: s.home_club ?? "",
  };
}

function buildPayload(f: EditFields, fedId: number | null): SkaterUpdatePayload {
  return {
    full_name: f.full_name.trim(),
    competitive_level: f.competitive_level || undefined,
    contact_email: f.contact_email.trim() || undefined,
    date_of_birth: f.date_of_birth || undefined,
    home_club: f.home_club.trim() || undefined,
    federation_id: fedId ?? undefined,
  };
}

function useEditSkater({ skater, onClose, onSaved }: ModalProps) {
  const { token } = useAuth();
  const [fields, setFields] = useState<EditFields>(() => initialFields(skater));
  const [fedId, setFedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (key: keyof EditFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const updated = await updateSkater(
        skater.skater_id,
        buildPayload(fields, fedId),
        token
      );
      onSaved(updated);
      onClose();
    } catch {
      setError("Could not save the changes. Please review the details and retry.");
    } finally {
      setBusy(false);
    }
  }
  return { fields, error, busy, token, update, setFedId, onSubmit };
}

function LevelSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label htmlFor="edit-competitive_level">Competitive Level</Label>
      <select
        id="edit-competitive_level"
        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select level…</option>
        {LEVELS.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

export function EditSkaterModal(props: ModalProps) {
  const { open, onClose } = props;
  const state = useEditSkater(props);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-skater-title"
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-skater-title" className="mb-4 text-lg font-bold text-slate-900">
          Edit Skater
        </h2>
        {state.error && (
          <Alert variant="danger" className="mb-4">
            {state.error}
          </Alert>
        )}
        <form onSubmit={state.onSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="edit-full_name"
              label="Full name"
              value={state.fields.full_name}
              onChange={(e) => state.update("full_name", e.target.value)}
            />
            <Field
              id="edit-date_of_birth"
              label="Date of birth"
              type="date"
              value={state.fields.date_of_birth}
              onChange={(e) => state.update("date_of_birth", e.target.value)}
            />
            <Field
              id="edit-home_club"
              label="Home Club / Rink"
              value={state.fields.home_club}
              onChange={(e) => state.update("home_club", e.target.value)}
            />
            <Field
              id="edit-contact_email"
              label="Contact Email"
              type="email"
              value={state.fields.contact_email}
              onChange={(e) => state.update("contact_email", e.target.value)}
            />
            <LevelSelect
              value={state.fields.competitive_level}
              onChange={(v) => state.update("competitive_level", v)}
            />
            <FederationCombobox
              token={state.token}
              onSelect={(f: Federation | null) => state.setFedId(f ? f.id : null)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={state.busy}>
              {state.busy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
