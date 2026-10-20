import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, TOKEN_KEY } from "@/context/AuthContext";
import { ProgramsTab } from "@/components/skaters/ProgramsTab";
import type { SkaterProgram } from "@/lib/types";
import { server } from "@/mocks/server";

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

const activeProgram: SkaterProgram = {
  id: "p-active",
  program_type: "SP",
  title: "Short Program 2026",
  season: "2025-26",
  is_archived: false,
};

const archivedProgram: SkaterProgram = {
  id: "p-archived",
  program_type: "FS",
  title: "Old Free Skate 2025",
  season: "2024-25",
  is_archived: true,
};

function renderTab(
  programs: SkaterProgram[],
  onProgramSaved: () => void = () => {}
) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ProgramsTab skaterId={2} programs={programs} onProgramSaved={onProgramSaved} />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("ProgramsTab archiving", () => {
  it("groups programs into Active and Archived sections", () => {
    seedSession();
    renderTab([activeProgram, archivedProgram]);
    expect(screen.getByText(/^Active$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Archived$/i)).toBeInTheDocument();
    expect(screen.getByText("Short Program 2026")).toBeInTheDocument();
    expect(screen.getByText("Old Free Skate 2025")).toBeInTheDocument();
  });

  it("archives an active program via the PATCH endpoint and refreshes", async () => {
    seedSession();
    const user = userEvent.setup();
    const onProgramSaved = vi.fn();
    let patched: Record<string, unknown> | null = null;
    server.use(
      http.patch("*/api/programs/:id", async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...activeProgram, is_archived: true });
      })
    );
    renderTab([activeProgram], onProgramSaved);
    await user.click(screen.getByRole("button", { name: /^archive$/i }));
    await waitFor(() => expect(patched).not.toBeNull());
    expect((patched as unknown as Record<string, unknown>).is_archived).toBe(true);
    await waitFor(() => expect(onProgramSaved).toHaveBeenCalled());
  });

  it("restores an archived program via the PATCH endpoint and refreshes", async () => {
    seedSession();
    const user = userEvent.setup();
    const onProgramSaved = vi.fn();
    let patched: Record<string, unknown> | null = null;
    server.use(
      http.patch("*/api/programs/:id", async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...archivedProgram, is_archived: false });
      })
    );
    renderTab([archivedProgram], onProgramSaved);
    await user.click(screen.getByRole("button", { name: /^restore$/i }));
    await waitFor(() => expect(patched).not.toBeNull());
    expect((patched as unknown as Record<string, unknown>).is_archived).toBe(false);
    await waitFor(() => expect(onProgramSaved).toHaveBeenCalled());
  });
});
