import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, TOKEN_KEY } from "@/context/AuthContext";
import { SkaterProfilePage } from "@/pages/SkaterProfilePage";
import { GapAnalysisPage } from "@/pages/GapAnalysisPage";

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

function renderGapPage() {
  return render(
    <MemoryRouter initialEntries={["/gap-analysis"]}>
      <AuthProvider>
        <GapAnalysisPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

async function openGapTab() {
  seedSession();
  renderProfile();
  await screen.findByText(/Ava Nguyen/);
  await userEvent.click(screen.getByRole("tab", { name: /gap analysis/i }));
}

describe("Gap Analysis wiring — Skater Profile tab", () => {
  it("renders the custom benchmark panel on the gap tab", async () => {
    await openGapTab();
    expect(
      await screen.findByRole("heading", { name: /Custom Benchmark Targets/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId("benchmark-summary")).toBeInTheDocument();
  });

  it("exposes the add-benchmark action on the gap tab", async () => {
    await openGapTab();
    expect(
      await screen.findByRole("button", { name: /\+ Add Benchmark/i })
    ).toBeInTheDocument();
  });

  it("never renders the retired competitive standard assessment form", async () => {
    await openGapTab();
    await screen.findByRole("heading", { name: /Custom Benchmark Targets/i });
    expect(screen.queryByLabelText(/benchmark template/i)).toBeNull();
    expect(
      screen.queryByText(/No benchmark assessment on record/i)
    ).toBeNull();
    expect(screen.queryAllByText(/exit standard/i)).toHaveLength(0);
  });
});

describe("Gap Analysis wiring — Gap Analysis page", () => {
  it("opens the custom benchmark panel for the athlete whose card is clicked", async () => {
    seedSession();
    renderGapPage();
    await userEvent.click(
      await screen.findByRole("button", { name: /Ava Nguyen/i })
    );
    expect(
      await screen.findByRole("heading", { name: /Custom Benchmark Targets/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId("benchmark-summary")).toBeInTheDocument();
  });

  it("never renders a benchmark template dropdown on the page", async () => {
    seedSession();
    renderGapPage();
    await userEvent.click(
      await screen.findByRole("button", { name: /Ava Nguyen/i })
    );
    await screen.findByRole("heading", { name: /Custom Benchmark Targets/i });
    expect(screen.queryByLabelText(/benchmark template/i)).toBeNull();
  });
});
