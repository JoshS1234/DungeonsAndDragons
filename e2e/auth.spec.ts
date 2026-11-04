import { expect, test } from "@playwright/test";
import { resetEmulators, signIn, signOut, signUp } from "./helpers";

test.beforeEach(resetEmulators);

test("sign up, sign out and sign back in", async ({ page }) => {
  await signUp(page, "dm@example.com");
  await signOut(page);
  await signIn(page, "dm@example.com");
});

test("shows a friendly error for a wrong password", async ({ page }) => {
  await signUp(page, "dm@example.com");
  await signOut(page);

  await page.getByLabel("Email").fill("dm@example.com");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "Incorrect email or password."
  );
});

test("keeps the current page on refresh", async ({ page }) => {
  await signUp(page, "dm@example.com");
  await page.goto("/#/rules");
  await page.reload();
  await expect(page.getByRole("heading", { name: "📜 Rules" })).toBeVisible();
});

test("shows a 404 page for unknown URLs", async ({ page }) => {
  await signUp(page, "dm@example.com");
  await page.goto("/#/nowhere");
  await expect(
    page.getByRole("heading", { name: "Page not found" })
  ).toBeVisible();
});
