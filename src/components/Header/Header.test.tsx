import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { signOut } from "firebase/auth";
import Header from "./Header";

vi.mock("../../../firebaseSetup", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({ signOut: vi.fn() }));

describe("Header", () => {
  it("signs out and returns to the home page", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/characters"]}>
        <Routes>
          <Route path="/" element={<p>Home page</p>} />
          <Route path="/characters" element={<Header />} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(signOut).toHaveBeenCalled();
    expect(screen.getByText("Home page")).toBeInTheDocument();
  });
});
