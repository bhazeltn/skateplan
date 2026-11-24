import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, TOKEN_KEY } from "@/context/AuthContext";
import { GapAnalysisPage } from "@/pages/GapAnalysisPage";

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/gap-analysis"]}>
      <AuthProvider>
        <GapAnalysisPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Competitive Development & Benchmark Assessment", () => {
  it("renders the coaching assessment heading", async () => {
    seedSession();
    renderPage();
    expect(
      await screen.findByRole("heading", {
        name: /Competitive Development & Benchmark Assessment/i,
      })
    ).toBeInTheDocument();
  });

  it("prompts to select an athlete before one is chosen", async () => {
    seedSession();
    renderPage();
    expect(
      await screen.findByText(
        /Select an athlete to manage their benchmark targets/i
      )
    ).toBeInTheDocument();
  });

  it("opens the custom benchmark panel for the athlete whose card is clicked", async () => {
    seedSession();
    renderPage();
    const user = userEvent.setup();

    // Roster populated from GET /api/skaters; clicking a card opens the panel.
    await user.click(await screen.findByRole("button", { name: /Ava Nguyen/i }));

    expect(
      await screen.findByRole("heading", { name: /Custom Benchmark Targets/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId("benchmark-summary")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /\+ Add Benchmark/i })
    ).toBeInTheDocument();
  });

  it("does not surface the retired four-pillar assessment form", async () => {
    seedSession();
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Ava Nguyen/i }));
    await screen.findByRole("heading", { name: /Custom Benchmark Targets/i });
    expect(screen.queryByLabelText(/benchmark template/i)).toBeNull();
  });
});
