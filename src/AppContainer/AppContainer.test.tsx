import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import AppContainer from "./AppContainer";

let emitAuthState: (user: User | null) => void;
vi.mock("../../firebaseSetup.ts", () => ({
  auth: {
    onAuthStateChanged: (callback: (user: User | null) => void) => {
      emitAuthState = callback;
      return () => {};
    },
  },
}));
vi.mock("firebase/auth", () => ({
  signOut: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
}));

describe("AppContainer", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  it("shows a loading message until auth state is known", () => {
    render(<AppContainer />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows the login page when signed out", () => {
    render(<AppContainer />);
    act(() => emitAuthState(null));
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows the app when signed in", async () => {
    render(<AppContainer />);
    act(() => emitAuthState({ uid: "user-1" } as User));
    expect(
      await screen.findByRole("heading", { name: "Welcome, Adventurer!" })
    ).toBeInTheDocument();
  });
});
