import { describe, expect, it } from "vitest";
import classTables from "../data/srd/classes.json";
import { DEFAULT_CHARACTER, proficiencyBonusForLevel } from "./dnd";
import type { CharacterData } from "./dnd";
import { loadSrdSpells, spellCounts, spellcastingFor } from "./spellcasting";

const caster = (overrides: Partial<CharacterData>): CharacterData => ({
  ...DEFAULT_CHARACTER,
  ...overrides,
});

describe("spellcastingFor", () => {
  it("works out a level 5 wizard", () => {
    const wizard = caster({
      class: "Wizard",
      level: 5,
      intelligence: 16,
      proficiencyBonus: 3,
    });
    expect(spellcastingFor(wizard)).toEqual({
      ability: "INT",
      slots: [4, 3, 2, 0, 0, 0, 0, 0, 0],
      maxSpellLevel: 3,
      cantripsKnown: 4,
      spellsKnown: null,
      preparedLimit: 8, // INT +3, level 5
      saveDC: 14,
      attackBonus: 6,
    });
  });

  it("gives known casters a spells-known limit instead", () => {
    const bard = spellcastingFor(
      caster({ class: "Bard", level: 3, charisma: 14 })
    )!;
    expect(bard.spellsKnown).toBe(6);
    expect(bard.preparedLimit).toBeNull();
  });

  it("uses half level for paladins, and starts them at level 2", () => {
    expect(spellcastingFor(caster({ class: "Paladin", level: 1 }))).toBeNull();
    const paladin = spellcastingFor(
      caster({ class: "Paladin", level: 6, charisma: 16 })
    )!;
    expect(paladin.preparedLimit).toBe(6); // CHA +3, half of 6
    expect(paladin.maxSpellLevel).toBe(2);
  });

  it("never prepares fewer than one spell", () => {
    const cleric = spellcastingFor(
      caster({ class: "Cleric", level: 1, wisdom: 3 })
    )!;
    expect(cleric.preparedLimit).toBe(1);
  });

  it("handles warlock pact magic", () => {
    const warlock = spellcastingFor(caster({ class: "Warlock", level: 5 }))!;
    expect(warlock.slots.slice(0, 3)).toEqual([0, 0, 2]);
    expect(warlock.maxSpellLevel).toBe(3);
  });

  it("returns null for non-casters and unknown classes", () => {
    expect(spellcastingFor(caster({ class: "Fighter", level: 10 }))).toBeNull();
    expect(spellcastingFor(caster({ class: "" }))).toBeNull();
  });
});

describe("spellCounts", () => {
  it("counts cantrips, levelled and prepared spells", () => {
    expect(
      spellCounts([
        { name: "Light", level: 0, prepared: true },
        { name: "Shield", level: 1, prepared: true },
        { name: "Sleep", level: 1, prepared: false },
      ])
    ).toEqual({ cantrips: 1, leveled: 2, prepared: 1 });
  });
});

describe("SRD data", () => {
  it("has 20 levels per class matching the proficiency bonus rule", () => {
    for (const [name, table] of Object.entries(classTables)) {
      expect(table.levels, name).toHaveLength(20);
      table.levels.forEach((row, i) => {
        expect(row.level).toBe(i + 1);
        expect(row.profBonus, `${name} ${row.level}`).toBe(
          proficiencyBonusForLevel(row.level)
        );
      });
    }
  });

  it("includes every SRD spell with its classes", async () => {
    const spells = await loadSrdSpells();
    expect(spells).toHaveLength(319);
    const fireball = spells.find((s) => s.name === "Fireball")!;
    expect(fireball.level).toBe(3);
    expect(fireball.classes).toEqual(["Sorcerer", "Wizard"]);
    expect(fireball.damage?.[0]).toMatchObject({
      type: "Fire",
      atSlotLevel: { "3": "8d6" },
    });
    expect(spells.every((s) => s.classes.length > 0)).toBe(true);
  });
});
