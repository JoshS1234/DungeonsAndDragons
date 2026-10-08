// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_CHARACTER } from "./dnd";
import type { CharacterData } from "./dnd";
import {
  PDF_TEMPLATE_FILE,
  buildPdfFieldValues,
  fillCharacterPDF,
  fillPdfTemplate,
} from "./fillCharacterPDF";

const templateBytes = readFileSync(
  resolve(__dirname, "../../public", PDF_TEMPLATE_FILE)
);

const character: CharacterData = {
  ...DEFAULT_CHARACTER,
  characterName: "Thalia Brightwood",
  class: "Rogue",
  level: 3,
  race: "Half-Elf",
  experiencePoints: 900,
  dexterity: 16,
  wisdom: 13,
  charisma: 8,
  proficiencyBonus: 2,
  currentHitPoints: 0,
  personalityTraits: "Curious",
  savingThrowProficiencies: ["DEX"],
  skillProficiencies: ["Stealth", "Perception"],
};

describe("buildPdfFieldValues", () => {
  const { text, checkboxes } = buildPdfFieldValues(character);

  it("combines class and level", () => {
    expect(text.ClassLevel).toBe("Rogue 3");
  });

  it("writes ability scores and signed modifiers", () => {
    expect(text.DEX).toBe("16");
    expect(text["DEXmod "]).toBe("+3");
    expect(text.CHamod).toBe("-1");
  });

  it("adds proficiency to proficient saving throws only", () => {
    expect(text["ST Dexterity"]).toBe("+5");
    expect(text["ST Strength"]).toBe("+0");
    expect(checkboxes["Check Box 18"]).toBe(true);
    expect(checkboxes["Check Box 11"]).toBe(false);
  });

  it("calculates skills and passive perception", () => {
    expect(text["Stealth "]).toBe("+5");
    expect(text["Perception "]).toBe("+3");
    expect(text.Passive).toBe("13");
    expect(checkboxes["Check Box 39"]).toBe(true);
  });

  it("keeps 0 current hit points", () => {
    expect(text.HPCurrent).toBe("0");
  });

  it("copes with characters missing fields", () => {
    expect(() =>
      buildPdfFieldValues({ characterName: "Legacy" })
    ).not.toThrow();
  });
});

describe("fillPdfTemplate", () => {
  let filled: PDFDocument;

  beforeAll(async () => {
    filled = await PDFDocument.load(
      await fillPdfTemplate(templateBytes, character)
    );
  });

  it("only maps to fields that exist in the template", async () => {
    const template = await PDFDocument.load(templateBytes);
    const form = template.getForm();
    const { text, checkboxes } = buildPdfFieldValues(character);

    for (const name of Object.keys(text)) {
      expect(() => form.getTextField(name), name).not.toThrow();
    }
    for (const name of Object.keys(checkboxes)) {
      expect(() => form.getCheckBox(name), name).not.toThrow();
    }
  });

  it("writes values into the generated PDF", () => {
    const form = filled.getForm();
    expect(form.getTextField("CharacterName").getText()).toBe(
      "Thalia Brightwood"
    );
    expect(form.getTextField("XP").getText()).toBe("900");
    expect(form.getTextField("PersonalityTraits ").getText()).toBe("Curious");
    expect(form.getCheckBox("Check Box 39").isChecked()).toBe(true);
    expect(form.getCheckBox("Check Box 23").isChecked()).toBe(false);
  });
});

describe("fillCharacterPDF", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("explains when the template can't be downloaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    );

    await expect(fillCharacterPDF(character)).rejects.toThrow(
      "Couldn't load the character sheet template"
    );
  });

  it("includes the status code when the server returns an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
    );

    await expect(fillCharacterPDF(character)).rejects.toThrow("(404)");
  });
});
