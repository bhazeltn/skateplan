import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AuthProvider, TOKEN_KEY } from "@/context/AuthContext";
import { AcceptInvitePage } from "@/pages/AcceptInvitePage";
import { seedPublicInvite } from "@/mocks/accessHandlers";

/** Surfaces the current pathname so we can assert the post-accept redirect. */
function LocationDisplay() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname}</div>;
}

function renderAt(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/accept-invite?token=${token}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/skaters/:id" element={<LocationDisplay />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("AcceptInvitePage", () => {
  it("shows the skater name and role for a valid token, then logs in on submit", async () => {
    const user = userEvent.setup();
    seedPublicInvite("tok1", {
      skater_name: "Ava Nguyen",
      target_role: "skater",
      email: "ava@example.com",
    });
    renderAt("tok1");

    expect(await screen.findByText(/Ava Nguyen/)).toBeInTheDocument();
    expect(screen.getByText(/^Skater$/)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/your name/i), "Ava Nguyen");
    await user.type(screen.getByLabelText(/choose a password/i), "supersecret");
    await user.click(screen.getByRole("button", { name: /accept & continue/i }));

    // The mock accept-invite endpoint logs in as user 42 and redirects there.
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/skaters/42")
    );
    expect(localStorage.getItem(TOKEN_KEY)).toBeTruthy();
  });

  it("blocks submission when the password is too short", async () => {
    const user = userEvent.setup();
    seedPublicInvite("tok3", { skater_name: "Noah Kim", target_role: "skater" });
    renderAt("tok3");

    await screen.findByText(/Noah Kim/);
    await user.type(screen.getByLabelText(/your name/i), "Noah Kim");
    await user.type(screen.getByLabelText(/choose a password/i), "short");
    await user.click(screen.getByRole("button", { name: /accept & continue/i }));

    expect(
      await screen.findByText(/at least 8 characters/i)
    ).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("shows a clear expired-link state for a used/expired token (410)", async () => {
    seedPublicInvite("tok2", { gone: true });
    renderAt("tok2");

    expect(
      await screen.findByText(/expired or has already been used/i)
    ).toBeInTheDocument();
  });

  it("shows an invalid-link state for an unknown token (404)", async () => {
    renderAt("nope");
    expect(
      await screen.findByText(/invite link is invalid/i)
    ).toBeInTheDocument();
  });
});
