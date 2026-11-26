import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import {
  acceptInvite,
  getPublicInvite,
  type PublicInviteOut,
} from "@/lib/accessApi";

type LoadState =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "expired" }
  | { kind: "ready"; invite: PublicInviteOut };

const ROLE_LABEL: Record<string, string> = {
  skater: "Skater",
  collaborator: "Collaborating coach",
  viewer: "Viewing coach",
};

/** Public onboarding page for an emailed invite link (/accept-invite?token=…). */
export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const { applyToken } = useAuth();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    getPublicInvite(token)
      .then((invite) => setState({ kind: "ready", invite }))
      .catch((e) => {
        const gone = e instanceof ApiError && e.status === 410;
        setState({ kind: gone ? "expired" : "invalid" });
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await acceptInvite({ token, full_name: fullName, password });
      applyToken(res.access_token);
      navigate(`/skaters/${res.user_id}`);
    } catch {
      setError("Could not accept this invite. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (state.kind === "loading") {
    return <Centered>Loading your invite…</Centered>;
  }
  if (state.kind === "invalid") {
    return (
      <Centered>
        <Alert variant="danger">
          This invite link is invalid. Please check the link or ask your coach to
          resend it.
        </Alert>
      </Centered>
    );
  }
  if (state.kind === "expired") {
    return (
      <Centered>
        <Alert variant="danger">
          This invite link has expired or has already been used. Please ask your
          coach to send a new invitation.
        </Alert>
      </Centered>
    );
  }

  const { invite } = state;
  const roleLabel = ROLE_LABEL[invite.target_role] ?? invite.target_role;
  return (
    <Centered>
      <div className="w-full space-y-5">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-bold text-slate-900">Accept your invite</h1>
          <p className="text-sm text-slate-600">
            You're joining {invite.skater_name ?? "a skater"} as{" "}
            <span className="font-semibold">{roleLabel}</span>.
          </p>
          <p className="text-xs text-slate-400">{invite.email}</p>
        </div>
        {error ? <Alert variant="danger">{error}</Alert> : null}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <Label htmlFor="full-name">Your name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Skater"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Choose a password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Setting up…" : "Accept & continue"}
          </Button>
        </form>
      </div>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}
