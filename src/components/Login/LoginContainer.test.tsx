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
  beforeEach(() => vi.clearAllMocks());

  it("signs in with the entered credentials", async () => {
    const user = userEvent.setup();
    render(<LoginContainer />);

    await user.type(screen.getByLabelText("Email"), "dm@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter22");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      "dm@example.com",
      "hunter22"
    );
  });

  it("shows a friendly message when sign-in fails", async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce({
      code: "auth/invalid-credential",
    });
    const user = userEvent.setup();
    render(<LoginContainer />);

    await user.type(screen.getByLabelText("Email"), "dm@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Incorrect email or password."
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("refuses to sign up when passwords differ", async () => {
    const user = userEvent.setup();
    render(<LoginContainer />);
    await user.click(screen.getByRole("button", { name: "New user" }));

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "password-one");
    await user.type(screen.getByLabelText("Confirm password"), "password-two");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your passwords don't match."
    );
    // The email isn't lost
    expect(screen.getByLabelText("Email")).toHaveValue("new@example.com");
  });

  it("creates an account", async () => {
    const user = userEvent.setup();
    render(<LoginContainer />);
    await user.click(screen.getByRole("button", { name: "New user" }));

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "password-one");
    await user.type(screen.getByLabelText("Confirm password"), "password-one");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      "new@example.com",
      "password-one"
    );
  });

  it("clears the error when switching forms", async () => {
    const user = userEvent.setup();
    render(<LoginContainer />);
    await user.click(screen.getByRole("button", { name: "New user" }));
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "password-one");
    await user.type(screen.getByLabelText("Confirm password"), "different");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await user.click(
      screen.getByRole("button", { name: "Already have account" })
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
