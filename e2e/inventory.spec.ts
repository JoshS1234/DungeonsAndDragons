import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { createCharacter, resetEmulators, signUp } from "./helpers";

test.beforeEach(resetEmulators);

test("weapons become attacks you can roll and export", async ({ page }) => {
  await signUp(page, "fighter@example.com");
  await createCharacter(page, "Bruenor");
  await page.getByRole("heading", { name: "Bruenor" }).click();

  await page.getByLabel("Gold (GP)").fill("15");
  await page.getByRole("button", { name: "Add items" }).click();
  await page.getByLabel("Search equipment").fill("handaxe");
  await page.getByRole("button", { name: "Add Handaxe" }).click();
  await page.getByRole("button", { name: "Save Changes" }).click();

  await page.getByRole("link", { name: "▶ Play" }).click();
  await page.getByRole("button", { name: /Roll Handaxe to hit/ }).click();
  await page.getByRole("button", { name: /Roll Handaxe damage/ }).click();
  await expect(page.getByText("Bruenor: Handaxe damage")).toBeVisible();

  await page.getByRole("link", { name: "Full sheet" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF" }).click();
  const pdf = await PDFDocument.load(
    await readFile((await (await downloadPromise).path())!)
  );
  const form = pdf.getForm();
  expect(form.getTextField("Wpn Name 1").getText()).toBe("Handaxe");
  expect(form.getTextField("Wpn1 Damage").getText()).toBe("1d6 Slashing");
  expect(form.getTextField("GP").getText()).toBe("15");
  expect(form.getTextField("Equipment").getText()).toContain("Handaxe");
});
