import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { InviteCreate, InviteResponse } from "@/lib/accessApi";

const FIELD =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 " +
  "focus:border-slate-500 focus:outline-none";

interface Props {
  onInvite: (payload: InviteCreate) => Promise<InviteResponse>;
  onInvited?: (res: InviteResponse) => void;
}

/** Invite form that surfaces the copyable accept-link (or a linked-coach banner)
 *  immediately after creating an invitation. */
export function InviteAccessForm({ onInvite, onInvited }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [last, setLast] = useState<InviteResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const link = last?.invite_path
    ? `${window.location.origin}${last.invite_path}`
    : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCopied(false);
    setBusy(true);
    try {
      const res = await onInvite({ email, role });
      setLast(res);
      setEmail("");
      onInvited?.(res);
    } catch {
      setError("Could not send the invite. Check the email and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard?.writeText(link);
    setCopied(true);
  }

  return (
    <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
      <h4 className="text-sm font-semibold text-slate-900">Invite someone</h4>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <form className="flex flex-wrap items-end gap-3" onSubmit={handleSubmit}>
        <div className="min-w-[12rem] flex-1 space-y-1">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="person@example.com"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="invite-role">Role</Label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={FIELD}
          >
            <option value="skater">Skater</option>
            <option value="collaborator">Collaborating coach</option>
            <option value="viewer">Viewing coach</option>
          </select>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Sending…" : "Send invite"}
        </Button>
      </form>

      {last?.status === "linked" ? (
        <Alert variant="success">
          Linked existing coach to this skater.
        </Alert>
      ) : null}

      {last?.status === "invited" && link ? (
        <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-medium text-emerald-800">
            Invite created — share this link:
          </p>
          <div className="flex items-center gap-2">
            <code
              data-testid="invite-link"
              className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 text-xs text-slate-700"
            >
              {link}
            </code>
            <Button type="button" size="sm" variant="outline" onClick={copyLink}>
              {copied ? "Copied!" : "Copy link"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
