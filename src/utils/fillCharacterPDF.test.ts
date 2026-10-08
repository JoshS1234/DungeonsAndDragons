// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_CHARACTER } from "./dnd";
import type { CharacterData } from "./dnd";
import spellPageFields from "./pdfSpellFields.json";
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

  it("fills death saves and inspiration", () => {
    const values = buildPdfFieldValues({
      ...character,
      deathSaveSuccesses: 2,
      deathSaveFailures: 1,
      inspiration: true,
    });
    expect(values.checkboxes["Check Box 13"]).toBe(true);
    expect(values.checkboxes["Check Box 14"]).toBe(false);
    expect(values.checkboxes["Check Box 15"]).toBe(true);
    expect(values.checkboxes["Check Box 16"]).toBe(false);
    expect(values.text.Inspiration).toBe("Yes");
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

describe("spell page", () => {
  const wizard: CharacterData = {
    ...DEFAULT_CHARACTER,
    class: "Wizard",
    level: 5,
    intelligence: 16,
    proficiencyBonus: 3,
    knownSpells: [
      { name: "Fire Bolt", level: 0, prepared: true, srdIndex: "fire-bolt" },
      { name: "Shield", level: 1, prepared: true, srdIndex: "shield" },
      { name: "Fireball", level: 3, prepared: false, srdIndex: "fireball" },
    ],
  };
  const { text, checkboxes } = buildPdfFieldValues(wizard);
  const line = (level: number, i: number) => spellPageFields[level].lines[i];

  it("fills spellcasting stats and slots", () => {
    expect(text["Spellcasting Class 2"]).toBe("Wizard");
    expect(text["SpellcastingAbility 2"]).toBe("INT");
    expect(text["SpellSaveDC  2"]).toBe("14");
    expect(text["SpellAtkBonus 2"]).toBe("+6");
    expect(text[spellPageFields[1].slotsTotal!]).toBe("4");
    expect(text[spellPageFields[3].slotsTotal!]).toBe("2");
    expect(text).not.toHaveProperty(spellPageFields[4].slotsTotal!);
  });

  it("lists spells under their level with prepared boxes", () => {
    expect(text[line(0, 0).name]).toBe("Fire Bolt");
    expect(text[line(1, 0).name]).toBe("Shield");
    expect(checkboxes[line(1, 0).prepared!]).toBe(true);
    expect(text[line(3, 0).name]).toBe("Fireball");
    expect(checkboxes[line(3, 0).prepared!]).toBe(false);
  });

  it("maps every spell-page field to one that exists in the template", async () => {
    const form = (await PDFDocument.load(templateBytes)).getForm();
    for (const { slotsTotal, lines } of spellPageFields) {
      if (slotsTotal) form.getTextField(slotsTotal);
      for (const { name, prepared } of lines) {
        form.getTextField(name);
        if (prepared) form.getCheckBox(prepared);
      }
    }
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
