import { expect, test } from "@playwright/test";
import { createCharacter, resetEmulators, signUp } from "./helpers";

test.beforeEach(resetEmulators);

test("roll dice from the dice page", async ({ page }) => {
  await signUp(page, "player@example.com");
  await page.getByRole("link", { name: "Dice" }).click();

  await page.getByLabel("Roll", { exact: true }).fill("3d6+2");
  await page.getByRole("button", { name: "Roll", exact: true }).click();

  const total = page
    .getByRole("list", { name: "Roll history" })
    .getByLabel(/^Total \d+$/);
  await expect(total).toHaveCount(1);
  const value = Number((await total.textContent())!.trim());
  expect(value).toBeGreaterThanOrEqual(5);
  expect(value).toBeLessThanOrEqual(20);
});

test("quick rolls from a character sheet appear on the dice page", async ({
  page,
}) => {
  await signUp(page, "player@example.com");
  await createCharacter(page, "Thalia");
  await page.getByRole("heading", { name: "Thalia" }).click();

  await page.getByText("🎲 Quick rolls").click();
  await page.getByRole("button", { name: /Roll Stealth/ }).click();
  await expect(page.getByText("Thalia: Stealth")).toBeVisible();

  await page.getByRole("link", { name: "Dice" }).click();
  await expect(page.getByText("Thalia: Stealth")).toBeVisible();
});
