import {
  ABILITIES,
  SKILLS,
  calculateModifier,
  formatModifier,
  normaliseCharacter,
  savingThrowModifier,
  skillModifier,
} from "./dnd";
import type { AbilityKey, CharacterData } from "./dnd";
import { spellcastingFor } from "./spellcasting";
import spellPageFields from "./pdfSpellFields.json";

export type { CharacterData } from "./dnd";

export const PDF_TEMPLATE_FILE = "TWC-DnD-5E-Character-Sheet-v1.6.pdf";

// Field names as they appear in the PDF template. Several genuinely contain
// trailing spaces. Run `npm test` to check every name here still exists.
const ABILITY_SCORE_FIELDS: Record<AbilityKey, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

const ABILITY_MODIFIER_FIELDS: Record<AbilityKey, string> = {
  strength: "STRmod",
  dexterity: "DEXmod ",
  constitution: "CONmod",
  intelligence: "INTmod",
  wisdom: "WISmod",
  charisma: "CHamod",
};

// The proficiency checkboxes are unnamed in the template, so they are mapped
// by their position on the sheet.
const SAVING_THROW_CHECKBOXES: Record<AbilityKey, string> = {
  strength: "Check Box 11",
  dexterity: "Check Box 18",
  constitution: "Check Box 19",
  intelligence: "Check Box 20",
  wisdom: "Check Box 21",
  charisma: "Check Box 22",
};

const SKILL_FIELDS: Record<string, { value: string; checkbox: string }> = {
  Acrobatics: { value: "Acrobatics", checkbox: "Check Box 23" },
  "Animal Handling": { value: "Animal", checkbox: "Check Box 24" },
  Arcana: { value: "Arcana", checkbox: "Check Box 25" },
  Athletics: { value: "Athletics", checkbox: "Check Box 26" },
  Deception: { value: "Deception ", checkbox: "Check Box 27" },
  History: { value: "History ", checkbox: "Check Box 28" },
  Insight: { value: "Insight", checkbox: "Check Box 29" },
  Intimidation: { value: "Intimidation", checkbox: "Check Box 30" },
  Investigation: { value: "Investigation ", checkbox: "Check Box 31" },
  Medicine: { value: "Medicine", checkbox: "Check Box 32" },
  Nature: { value: "Nature", checkbox: "Check Box 33" },
  Perception: { value: "Perception ", checkbox: "Check Box 34" },
  Performance: { value: "Performance", checkbox: "Check Box 35" },
  Persuasion: { value: "Persuasion", checkbox: "Check Box 36" },
  Religion: { value: "Religion", checkbox: "Check Box 37" },
  "Sleight of Hand": { value: "SleightofHand", checkbox: "Check Box 38" },
  Stealth: { value: "Stealth ", checkbox: "Check Box 39" },
  Survival: { value: "Survival", checkbox: "Check Box 40" },
};

// Large free-text boxes default to auto-sized text, which renders short
// entries enormously. Give them a fixed size instead.
const LONG_TEXT_FIELDS = new Set([
  "PersonalityTraits ",
  "Ideals",
  "Bonds",
  "Flaws",
  "Allies",
  "Features and Traits",
  "Equipment",
  "AttacksSpellcasting",
]);
const LONG_TEXT_FONT_SIZE = 9;

export interface PdfFieldValues {
  text: Record<string, string>;
  checkboxes: Record<string, boolean>;
}

/** Work out every PDF form value for a character, without touching the PDF. */
export const buildPdfFieldValues = (
  rawCharacter: Partial<CharacterData>
): PdfFieldValues => {
  const c = normaliseCharacter(rawCharacter);

  const text: Record<string, string> = {
    CharacterName: c.characterName,
    "CharacterName 2": c.characterName,
    ClassLevel: `${c.class} ${c.level}`.trim(),
    Background: c.background,
    PlayerName: c.playerName,
    "Race ": c.race,
    Alignment: c.alignment,
    XP: String(c.experiencePoints),

    ProfBonus: formatModifier(c.proficiencyBonus),
    AC: String(c.armorClass),
    Initiative: formatModifier(c.initiative),
    Speed: String(c.speed),
    HPMax: String(c.maxHitPoints),
    HPCurrent: String(c.currentHitPoints),
    HPTemp: String(c.temporaryHitPoints),
    HDTotal: c.hitDice,
    HD: c.hitDice,

    "PersonalityTraits ": c.personalityTraits,
    Ideals: c.ideals,
    Bonds: c.bonds,
    Flaws: c.flaws,
    Allies: c.alliesAndOrganizations,
    "Features and Traits": c.additionalFeaturesAndTraits,
    Equipment: c.equipment,
    AttacksSpellcasting: c.spells,
  };
  const checkboxes: Record<string, boolean> = {};

  for (const ability of ABILITIES) {
    const score = c[ability.key];
    text[ABILITY_SCORE_FIELDS[ability.key]] = String(score);
    text[ABILITY_MODIFIER_FIELDS[ability.key]] = formatModifier(
      calculateModifier(score)
    );
    text[`ST ${ability.name}`] = formatModifier(
      savingThrowModifier(c, ability)
    );
    checkboxes[SAVING_THROW_CHECKBOXES[ability.key]] =
      c.savingThrowProficiencies.includes(ability.abbrev);
  }

  for (const skill of SKILLS) {
    const fields = SKILL_FIELDS[skill.name];
    text[fields.value] = formatModifier(skillModifier(c, skill));
    checkboxes[fields.checkbox] = c.skillProficiencies.includes(skill.name);
  }

  const perception = SKILLS.find((s) => s.name === "Perception")!;
  text.Passive = String(10 + skillModifier(c, perception));

  // Death save circles: three successes then three failures
  ["Check Box 12", "Check Box 13", "Check Box 14"].forEach((box, i) => {
    checkboxes[box] = i < c.deathSaveSuccesses;
  });
  ["Check Box 15", "Check Box 16", "Check Box 17"].forEach((box, i) => {
    checkboxes[box] = i < c.deathSaveFailures;
  });
  if (c.inspiration) text.Inspiration = "Yes";

  addSpellPage(c, text, checkboxes);

  return { text, checkboxes };
};

/**
 * Page 3: spellcasting stats, slots, and spells by level. Field names come
 * from scripts/pdf-spell-fields.mjs. Spells beyond the lines available for
 * a level are left off.
 */
const addSpellPage = (
  c: CharacterData,
  text: Record<string, string>,
  checkboxes: Record<string, boolean>
) => {
  const casting = spellcastingFor(c);
  if (casting) {
    text["Spellcasting Class 2"] = c.class;
    text["SpellcastingAbility 2"] = casting.ability;
    text["SpellSaveDC  2"] = String(casting.saveDC);
    text["SpellAtkBonus 2"] = formatModifier(casting.attackBonus);
  }

  for (const { level, slotsTotal, lines } of spellPageFields) {
    const slots = casting?.slots[level - 1] ?? 0;
    if (slotsTotal && slots > 0) text[slotsTotal] = String(slots);

    const spells = c.knownSpells
      .filter((spell) => spell.level === level)
      .sort((a, b) => a.name.localeCompare(b.name));
    spells.slice(0, lines.length).forEach((spell, i) => {
      text[lines[i].name] = spell.name;
      const box = lines[i].prepared;
      if (box) checkboxes[box] = spell.prepared;
    });
  }
};

export const fillPdfTemplate = async (
  templateBytes: ArrayBuffer | Uint8Array,
  character: Partial<CharacterData>
): Promise<Uint8Array> => {
  // Loaded on demand: pdf-lib is large and only needed when exporting
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { text, checkboxes } = buildPdfFieldValues(character);

  for (const [name, value] of Object.entries(text)) {
    const field = form.getTextField(name);
    if (LONG_TEXT_FIELDS.has(name)) field.setFontSize(LONG_TEXT_FONT_SIZE);
    field.setText(value);
    field.updateAppearances(font);
  }
  // Template boxes start unchecked, and their existing appearance streams
  // handle the checked state, so only set the ones that need ticking.
  for (const [name, checked] of Object.entries(checkboxes)) {
    if (checked) form.getCheckBox(name).check();
  }

  // pdf-lib's default appearance regeneration redraws every checkbox with a
  // square border, so it's disabled here and text fields are updated above.
  return pdfDoc.save({ updateFieldAppearances: false });
};

const downloadBytes = (bytes: Uint8Array, fileName: string) => {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const fillCharacterPDF = async (character: Partial<CharacterData>) => {
  const templateError =
    "Couldn't load the character sheet template. Check your connection and try again.";
  let response: Response;
  try {
    response = await fetch(`${import.meta.env.BASE_URL}${PDF_TEMPLATE_FILE}`);
  } catch {
    throw new Error(templateError);
  }
  if (!response.ok) {
    throw new Error(`${templateError} (${response.status})`);
  }

  const pdfBytes = await fillPdfTemplate(
    await response.arrayBuffer(),
    character
  );
  downloadBytes(
    pdfBytes,
    `${character.characterName || "Character"}_Sheet.pdf`
  );
};
