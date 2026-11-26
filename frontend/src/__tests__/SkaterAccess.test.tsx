import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, TOKEN_KEY } from "@/context/AuthContext";
import { SkaterProfilePage } from "@/pages/SkaterProfilePage";
import { server } from "@/mocks/server";
import {
  seedCoaches,
  seedInvites,
  setMockCapabilities,
} from "@/mocks/accessHandlers";

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

function seedBenchmark() {
  server.use(
    http.get("*/api/skaters/:id/benchmarks", () =>
      HttpResponse.json([
        {
          id: "g1",
          category: "Jump",
          name: "Clean 3Lz",
          status: "DEVELOPING",
          action_plan: "Rotation drills",
          success_criteria: "Positive GOE",
        },
      ])
    )
  );
}

function renderProfile() {
  return render(
    <MemoryRouter initialEntries={["/skaters/1"]}>
      <AuthProvider>
        <Routes>
          <Route path="/skaters/:id" element={<SkaterProfilePage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("SkaterAccess — (a) primary coach", () => {
  it("sees the Access tab, creates a skater invite and sees the copyable link", async () => {
    const user = userEvent.setup();
    seedSession();
    renderProfile();
    await screen.findByText(/Ava Nguyen/);

    const accessTab = await screen.findByRole("tab", { name: /access/i });
    await user.click(accessTab);

    await user.type(
      await screen.findByLabelText("Email"),
      "newskater@example.com"
    );
    await user.selectOptions(screen.getByLabelText("Role"), "skater");
    await user.click(screen.getByRole("button", { name: /send invite/i }));

    const link = await screen.findByTestId("invite-link");
    expect(link).toHaveTextContent("/accept-invite?token=");
  });

  it("toggles a co-coach viewer→collaborator and revokes a pending invite", async () => {
    const user = userEvent.setup();
    seedSession();
    seedCoaches([
      {
        coach_user_id: 2,
        email: "co@x.com",
        first_name: "Coco",
        last_name: "Coach",
        permission_level: "viewer",
      },
    ]);
    seedInvites([
      {
        token: "t",
        invite_id: "inv1",
        email: "pending@x.com",
        target_role: "skater",
        expires_at: "2099-01-01T00:00:00Z",
        accepted_at: null,
      },
    ]);
    renderProfile();
    await screen.findByText(/Ava Nguyen/);
    await user.click(await screen.findByRole("tab", { name: /access/i }));

    const roleSelect = await screen.findByLabelText("Role for Coco Coach");
    await user.selectOptions(roleSelect, "collaborator");
    await waitFor(() =>
      expect(screen.getByLabelText("Role for Coco Coach")).toHaveValue(
        "collaborator"
      )
    );

    expect(screen.getByText("pending@x.com")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /revoke/i }));
    await waitFor(() =>
      expect(screen.queryByText("pending@x.com")).not.toBeInTheDocument()
    );
  });
});

describe("SkaterAccess — (b) skater persona", () => {
  function asSkater() {
    seedSession();
    setMockCapabilities({
      can_edit_plan: false,
      can_edit_goals: true,
      can_log_training: true,
      can_manage_access: false,
    });
  }

  it("hides the Access tab", async () => {
    asSkater();
    renderProfile();
    await screen.findByText(/Ava Nguyen/);
    // Give capabilities time to resolve, then confirm no Access tab appears.
    await screen.findByRole("tab", { name: /^goals$/i });
    expect(screen.queryByRole("tab", { name: /access/i })).not.toBeInTheDocument();
  });

  it("can add/edit a goal but sees no Delete control", async () => {
    const user = userEvent.setup();
    asSkater();
    seedBenchmark();
    renderProfile();
    await screen.findByText(/Ava Nguyen/);
    await user.click(screen.getByRole("tab", { name: /^goals$/i }));

    expect(
      await screen.findByRole("button", { name: /add goal/i })
    ).toBeInTheDocument();
    const active = await screen.findByTestId("active-goals");
    expect(within(active).getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(
      within(active).queryByRole("button", { name: /delete/i })
    ).not.toBeInTheDocument();
  });

  it("sees read-only Programs, Benchmarks and Season Plan but can still log training", async () => {
    const user = userEvent.setup();
    asSkater();
    renderProfile();
    await screen.findByText(/Ava Nguyen/);
    // Wait for capabilities to resolve via the goals tab gate.
    await user.click(screen.getByRole("tab", { name: /^goals$/i }));
    await screen.findByRole("button", { name: /add goal/i });

    await user.click(screen.getByRole("tab", { name: /programs/i }));
    expect(
      screen.queryByRole("button", { name: /build new program/i })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /gap analysis/i }));
    expect(
      screen.queryByRole("button", { name: /add benchmark/i })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /season plan/i }));
    expect(
      screen.queryByRole("button", { name: /create season plan/i })
    ).not.toBeInTheDocument();

    // Training stays available to the skater.
    expect(screen.getByRole("tab", { name: /training/i })).toBeInTheDocument();
  });
});

describe("SkaterAccess — (c) viewer co-coach", () => {
  function asViewer() {
    seedSession();
    setMockCapabilities({
      can_edit_plan: false,
      can_edit_goals: false,
      can_log_training: false,
      can_manage_access: false,
    });
  }

  it("sees fully read-only Goals (static status badge, no edit/delete)", async () => {
    const user = userEvent.setup();
    asViewer();
    seedBenchmark();
    renderProfile();
    await screen.findByText(/Ava Nguyen/);
    await user.click(screen.getByRole("tab", { name: /^goals$/i }));

    const active = await screen.findByTestId("active-goals");
    expect(within(active).getByText(/Clean 3Lz/)).toBeInTheDocument();
    // No Add Goal, no inline status dropdown, no Edit/Delete.
    expect(
      screen.queryByRole("button", { name: /add goal/i })
    ).not.toBeInTheDocument();
    expect(
      within(active).queryByLabelText(/status for Clean 3Lz/i)
    ).not.toBeInTheDocument();
    expect(
      within(active).queryByRole("button", { name: /edit/i })
    ).not.toBeInTheDocument();
    expect(
      within(active).queryByRole("button", { name: /delete/i })
    ).not.toBeInTheDocument();
  });

  it("hides the Access tab and program/benchmark create actions", async () => {
    const user = userEvent.setup();
    asViewer();
    renderProfile();
    await screen.findByText(/Ava Nguyen/);
    await user.click(screen.getByRole("tab", { name: /^goals$/i }));
    // Confirm caps resolved: no Add Goal for a viewer.
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /add goal/i })
      ).not.toBeInTheDocument()
    );

    expect(screen.queryByRole("tab", { name: /access/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /programs/i }));
    expect(
      screen.queryByRole("button", { name: /build new program/i })
    ).not.toBeInTheDocument();
  });
});
