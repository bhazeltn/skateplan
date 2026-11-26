import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, TOKEN_KEY } from "@/context/AuthContext";
import { SkaterProfilePage } from "@/pages/SkaterProfilePage";
import { server } from "@/mocks/server";
import { mockSkaterDetail } from "@/mocks/handlers";
import { setMockCapabilities } from "@/mocks/accessHandlers";

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
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

describe("Edit Skater", () => {
  it("coach edits name and level, saves, modal closes and header updates", async () => {
    const patched = vi.fn();
    server.use(
      http.patch("*/api/skaters/:id", async ({ request }) => {
        const body = (await request.json()) as Record<string, string>;
        patched(body);
        const [first, ...rest] = (body.full_name ?? "").trim().split(" ");
        return HttpResponse.json({
          ...mockSkaterDetail,
          first_name: first,
          last_name: rest.join(" "),
          competitive_level: body.competitive_level ?? mockSkaterDetail.competitive_level,
        });
      })
    );
    seedSession();
    renderProfile();
    await screen.findByText(/Ava Nguyen/);

    await userEvent.click(screen.getByRole("button", { name: /edit profile/i }));
    const dialog = within(screen.getByRole("dialog"));
    const nameField = dialog.getByLabelText(/full name/i);
    await userEvent.clear(nameField);
    await userEvent.type(nameField, "Mia Chen");
    await userEvent.selectOptions(
      dialog.getByLabelText(/competitive level/i),
      "Junior"
    );
    await userEvent.click(dialog.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    expect(patched).toHaveBeenCalledWith(
      expect.objectContaining({ full_name: "Mia Chen", competitive_level: "Junior" })
    );
    expect(screen.getByText(/Mia Chen/)).toBeInTheDocument();
    expect(screen.getByText(/Junior/)).toBeInTheDocument();
  });

  it("hides the Edit button when the viewer cannot edit the plan", async () => {
    setMockCapabilities({ can_edit_plan: false, can_manage_access: false });
    seedSession();
    renderProfile();
    await screen.findByText(/Ava Nguyen/);
    expect(
      screen.queryByRole("button", { name: /edit profile/i })
    ).not.toBeInTheDocument();
  });
});
