import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./authErrors";

describe("authErrorMessage", () => {
  it("translates known Firebase error codes", () => {
    expect(authErrorMessage({ code: "auth/invalid-credential" })).toBe(
      "Incorrect email or password."
    );
    expect(authErrorMessage({ code: "auth/email-already-in-use" })).toBe(
      "An account with that email already exists."
    );
  });

  it("explains when sign-ups are closed", () => {
    expect(authErrorMessage({ code: "auth/admin-restricted-operation" })).toBe(
      "New sign-ups are closed. Ask whoever runs the site to let you in."
    );
  });

  it("falls back to a generic message", () => {
    expect(authErrorMessage({ code: "auth/something-new" })).toBe(
      "Something went wrong. Please try again."
    );
    expect(authErrorMessage(new Error("boom"))).toBe(
      "Something went wrong. Please try again."
    );
  });
});
