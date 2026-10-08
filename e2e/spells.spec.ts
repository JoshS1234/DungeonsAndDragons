import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { createCharacter, resetEmulators, signUp } from "./helpers";

type SpellPageFields = Array<{
  level: number;
  slotsTotal: string | null;
  lines: Array<{ name: string; prepared: string | null }>;
}>;

const spellPageFields: SpellPageFields = JSON.parse(
  await readFile(
    new URL("../src/utils/pdfSpellFields.json", import.meta.url),
    "utf8"
  )
);

test.beforeEach(resetEmulators);

test("a wizard picks, prepares and exports spells", async ({ page }) => {
  await signUp(page, "wizard@example.com");
  await createCharacter(page, "Elminster", { characterClass: "Wizard" });
  await page.getByRole("heading", { name: "Elminster" }).click();

  // Levelling up moves the proficiency bonus with it
  await page.getByLabel("Level", { exact: true }).fill("5");
  await expect(page.getByLabel("Proficiency Bonus")).toHaveValue("3");

  await page.getByRole("button", { name: "Add spells" }).click();
  await page.getByLabel("Search spells").fill("magic missile");
  await page.getByRole("button", { name: "Add Magic Missile" }).click();
  await page.getByLabel("Magic Missile prepared").check();
  await page.getByRole("button", { name: "Save Changes" }).click();

  await page.getByRole("heading", { name: "Elminster" }).click();
  await expect(page.getByLabel("Magic Missile prepared")).toBeChecked();
  await expect(page.getByLabel("Spell slots")).toContainText("3rd level: 2");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF" }).click();
  const download = await downloadPromise;

  const pdf = await PDFDocument.load(await readFile((await download.path())!));
  const form = pdf.getForm();
  const firstLevel = spellPageFields[1];
  expect(form.getTextField(firstLevel.lines[0].name).getText()).toBe(
    "Magic Missile"
  );
  expect(form.getCheckBox(firstLevel.lines[0].prepared!).isChecked()).toBe(
    true
  );
  expect(form.getTextField("SpellcastingAbility 2").getText()).toBe("INT");
});
