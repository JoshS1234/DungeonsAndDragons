import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { createCharacter, resetEmulators, signUp } from "./helpers";

// Storage isn't wiped between tests, but portraits are keyed by fresh
// character IDs, so leftovers from earlier runs don't matter
test.beforeEach(resetEmulators);

test("upload a portrait and see it everywhere", async ({ page }) => {
  await signUp(page, "player@example.com");
  await createCharacter(page, "Thalia");
  await page.getByRole("heading", { name: "Thalia" }).click();

  await page
    .getByLabel("Upload portrait")
    .setInputFiles("public/DNDBackground.png");
  const portrait = page.getByRole("img", { name: "Portrait of Thalia" });
  await expect(portrait).toBeVisible();

  // The browser shrank it before uploading
  const size = await portrait.evaluate((img: HTMLImageElement) =>
    Math.max(img.naturalWidth, img.naturalHeight)
  );
  expect(size).toBeLessThanOrEqual(512);

  await page.goto("/#/characters");
  await expect(
    page.getByRole("img", { name: "Portrait of Thalia" })
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "📄 Export PDF" }).click();
  const pdf = await PDFDocument.load(
    await readFile((await (await downloadPromise).path())!)
  );
  const button = pdf.getForm().getButton("CHARACTER IMAGE");
  expect(button.acroField.getWidgets()[0].getNormalAppearance()).toBeDefined();
});
