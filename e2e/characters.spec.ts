import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { createCharacter, resetEmulators, signUp } from "./helpers";

test.beforeEach(resetEmulators);

test("create, edit and delete a character", async ({ page }) => {
  await signUp(page, "player@example.com");
  await createCharacter(page, "Thalia");

  await page.getByRole("heading", { name: "Thalia" }).click();
  await expect(
    page.getByRole("heading", { name: "Edit Character: Thalia" })
  ).toBeVisible();
  await page.getByLabel("Character Name").fill("Thalia the Bold");
  await page.getByLabel("Current Hit Points").fill("0");
  await page.getByRole("button", { name: "Save Changes" }).click();

  // 0 HP survives a reload (it used to come back as 8)
  await page.getByRole("heading", { name: "Thalia the Bold" }).click();
  await expect(page.getByLabel("Current Hit Points")).toHaveValue("0");

  await page.getByRole("button", { name: "Delete Character" }).click();
  await page.getByLabel("Name to confirm deletion").fill("Thalia the Bold");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete Character" })
    .click();
  await expect(page.getByText("No characters created yet.")).toBeVisible();
});

test("exports a filled PDF character sheet", async ({ page }) => {
  await signUp(page, "player@example.com");
  await createCharacter(page, "Thalia");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "📄 Export PDF" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("Thalia_Sheet.pdf");
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
});
