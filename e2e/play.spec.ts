import { expect, test } from "@playwright/test";
import { createCharacter, resetEmulators, signUp } from "./helpers";

test.beforeEach(resetEmulators);

test("play mode tracks HP, death saves and rests", async ({ page }) => {
  await signUp(page, "player@example.com");
  await createCharacter(page, "Thalia");
  await page.getByRole("link", { name: "▶ Play" }).click();

  const hp = page.getByLabel("Current hit points");
  await expect(hp).toHaveText("8");

  await page.getByLabel("Amount").fill("20");
  await page.getByRole("button", { name: "Damage" }).click();
  await expect(hp).toHaveText("0");
  await expect(page.getByRole("region", { name: "Death saves" })).toContainText(
    "Dying"
  );
  await page.getByRole("button", { name: "Poisoned" }).click();

  // Survives a reload: it's saved, not just local state
  await page.reload();
  await expect(hp).toHaveText("0");
  await expect(page.getByRole("button", { name: "Poisoned" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  await page.getByRole("button", { name: "Long rest" }).click();
  await expect(hp).toHaveText("8");
  await expect(page.getByRole("region", { name: "Death saves" })).toHaveCount(
    0
  );
});
