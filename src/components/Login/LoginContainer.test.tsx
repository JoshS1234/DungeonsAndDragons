import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import LoginContainer from "./LoginContainer";

vi.mock("../../../firebaseSetup", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: vi.fn(() => Promise.resolve()),
  createUserWithEmailAndPassword: vi.fn(() => Promise.resolve()),
}));

describe("LoginContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  it("signs in with the entered credentials", async () => {
    const user = userEvent.setup();
    render(<LoginContainer />);

    await user.type(screen.getByLabelText("Email"), "dm@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter22");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      "dm@example.com",
      "hunter22"
    );
  });

  it("refuses to sign up when passwords differ", async () => {
    const user = userEvent.setup();
    render(<LoginContainer />);
    await user.click(screen.getByRole("button", { name: "New user" }));

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "one");
    await user.type(screen.getByLabelText("Confirm password"), "two");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith("your passwords did not match");
  });
});
