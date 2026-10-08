import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Layout from "./Layout";
import NotFound from "../../pages/NotFound/NotFound";

vi.mock("../../../firebaseSetup", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({ signOut: vi.fn() }));

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<p>Home page</p>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

describe("Layout", () => {
  it("wraps pages in the header", () => {
    renderAt("/");
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.getByText("Home page")).toBeInTheDocument();
  });

  it("shows a 404 page for unknown URLs", () => {
    renderAt("/no-such-page");
    expect(
      screen.getByRole("heading", { name: "Page not found" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
      "href",
      "/"
    );
  });
});
