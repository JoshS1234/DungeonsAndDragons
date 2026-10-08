import { describe, expect, it } from "vitest";
import { DEFAULT_CHARACTER } from "./dnd";
import type { CharacterData } from "./dnd";
import {
  attackBonus,
  attackFromWeapon,
  damageExpression,
  inventoryText,
  loadSrdEquipment,
} from "./inventory";
import type { Attack } from "./inventory";

const fighter: CharacterData = {
  ...DEFAULT_CHARACTER,
  strength: 16,
  dexterity: 12,
  proficiencyBonus: 2,
};

const longsword: Attack = {
  name: "Longsword",
  ability: "STR",
  proficient: true,
  damageDice: "1d8",
  damageType: "Slashing",
  magicBonus: 0,
};

describe("attack maths", () => {
  it("adds ability modifier and proficiency to hit", () => {
    expect(attackBonus(fighter, longsword)).toBe(5);
    expect(attackBonus(fighter, { ...longsword, proficient: false })).toBe(3);
  });

  it("adds a magic bonus to hit and damage", () => {
    const plusOne = { ...longsword, magicBonus: 1 };
    expect(attackBonus(fighter, plusOne)).toBe(6);
    expect(damageExpression(fighter, plusOne)).toBe("1d8+4");
  });

  it("writes damage with negative or zero modifiers", () => {
    const weak = { ...fighter, strength: 8 };
    expect(damageExpression(weak, longsword)).toBe("1d8-1");
    expect(damageExpression({ ...fighter, strength: 10 }, longsword)).toBe(
      "1d8"
    );
  });
});

describe("attackFromWeapon", () => {
  const weapon = async (name: string) =>
    (await loadSrdEquipment()).find((item) => item.name === name)!;

  it("uses STR for melee weapons", async () => {
    expect(attackFromWeapon(fighter, await weapon("Longsword"))).toEqual(
      longsword
    );
  });

  it("uses DEX for ranged weapons", async () => {
    expect(attackFromWeapon(fighter, await weapon("Longbow")).ability).toBe(
      "DEX"
    );
  });

  it("uses the better ability for finesse weapons", async () => {
    const rapier = await weapon("Rapier");
    expect(attackFromWeapon(fighter, rapier).ability).toBe("STR");
    expect(
      attackFromWeapon({ ...fighter, dexterity: 18 }, rapier).ability
    ).toBe("DEX");
  });
});

describe("inventoryText", () => {
  it("lists items with quantities, then notes", () => {
    expect(
      inventoryText({
        ...DEFAULT_CHARACTER,
        inventory: [
          { name: "Rope, hempen (50 feet)", quantity: 1 },
          { name: "Dagger", quantity: 2 },
        ],
        equipment: "Lucky coin",
      })
    ).toBe("Rope, hempen (50 feet)\nDagger ×2\nLucky coin");
  });
});

describe("SRD equipment", () => {
  it("includes weapons and armour", async () => {
    const items = await loadSrdEquipment();
    expect(items.length).toBe(237);
    expect(items.find((i) => i.name === "Chain Mail")?.armor?.baseAC).toBe(16);
  });
});
