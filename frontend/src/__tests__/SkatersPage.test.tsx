import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SkatersPage } from "@/pages/SkatersPage";
import { renderWithProviders } from "@/test/utils";
import { TOKEN_KEY } from "@/context/AuthContext";

function seedSession() {
  const payload = btoa(JSON.stringify({ user_id: 10, system_role: "coach" }));
  localStorage.setItem(TOKEN_KEY, `h.${payload}.s`);
}

describe("Coach Skater Roster Overview — /skaters", () => {
  it("renders roster rows with name, club, federation and level", async () => {
    seedSession();
    renderWithProviders(<SkatersPage />, { route: "/skaters" });
    const row = await screen.findByTestId("skater-row-1");
    const cell = within(row);
    expect(cell.getByText(/Ava Nguyen/)).toBeInTheDocument();
    expect(cell.getByText(/Glacier FSC/)).toBeInTheDocument();
    expect(cell.getByText(/Philippine Skating Union/)).toBeInTheDocument();
    expect(cell.getByText(/Senior/)).toBeInTheDocument();
  });

  it("links each skater name to the profile route /skaters/:id", async () => {
    seedSession();
    renderWithProviders(<SkatersPage />, { route: "/skaters" });
    const row = await screen.findByTestId("skater-row-1");
    const link = within(row).getByRole("link", { name: /Ava Nguyen/ });
    expect(link).toHaveAttribute("href", "/skaters/1");
  });

  it("shows an active-restriction badge only for restricted skaters", async () => {
    seedSession();
    renderWithProviders(<SkatersPage />, { route: "/skaters" });
    const restricted = await screen.findByTestId("skater-row-1");
    const clear = await screen.findByTestId("skater-row-2");
    expect(
      within(restricted).getByText(/active restriction/i)
    ).toBeInTheDocument();
    expect(
      within(clear).queryByText(/active restriction/i)
    ).not.toBeInTheDocument();
  });

  it("renders program segment chips and a missing-segment warning", async () => {
    seedSession();
    renderWithProviders(<SkatersPage />, { route: "/skaters" });
    const full = await screen.findByTestId("skater-row-1");
    expect(within(full).getByText("SP")).toBeInTheDocument();
    expect(within(full).getByText("FS")).toBeInTheDocument();
    const partial = await screen.findByTestId("skater-row-2");
    expect(within(partial).getByText("SP")).toBeInTheDocument();
    expect(within(partial).getByText(/missing fs/i)).toBeInTheDocument();
  });

  it("surfaces a priority dashboard alert against the matching skater", async () => {
    seedSession();
    renderWithProviders(<SkatersPage />, { route: "/skaters" });
    const row = await screen.findByTestId("skater-row-1");
    await waitFor(() =>
      expect(within(row).getByText(/behind schedule/i)).toBeInTheDocument()
    );
  });

  it("filters the roster in real time via the search input", async () => {
    seedSession();
    const user = userEvent.setup();
    renderWithProviders(<SkatersPage />, { route: "/skaters" });
    await screen.findByTestId("skater-row-1");
    const search = screen.getByRole("searchbox", { name: /search skaters/i });
    await user.type(search, "Liam");
    await waitFor(() =>
      expect(screen.queryByTestId("skater-row-1")).not.toBeInTheDocument()
    );
    expect(screen.getByTestId("skater-row-2")).toBeInTheDocument();
  });
});
