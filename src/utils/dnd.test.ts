import { describe, expect, it } from "vitest";
import {
  ABILITIES,
  DEFAULT_CHARACTER,
  SKILLS,
  calculateModifier,
  derivedChanges,
  formatModifier,
  proficiencyBonusForLevel,
  normaliseCharacter,
  roll4d6DropLowest,
  rollAbilityScores,
  savingThrowModifier,
  skillModifier,
} from "./dnd";

/** Returns a fake Math.random that yields each die face in turn. */
const diceSequence = (...faces: number[]) => {
  let i = 0;
  return () => (faces[i++ % faces.length] - 1) / 6;
};

describe("calculateModifier", () => {
  it.each([
    [1, -5],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [12, 1],
    [15, 2],
    [20, 5],
    [30, 10],
  ])("score %i gives modifier %i", (score, expected) => {
    expect(calculateModifier(score)).toBe(expected);
  });
});

describe("formatModifier", () => {
  it("prefixes non-negative values with +", () => {
    expect(formatModifier(0)).toBe("+0");
    expect(formatModifier(3)).toBe("+3");
  });

  it("leaves negative values alone", () => {
    expect(formatModifier(-2)).toBe("-2");
  });
});

describe("roll4d6DropLowest", () => {
  it("sums the highest three dice", () => {
    expect(roll4d6DropLowest(diceSequence(1, 6, 3, 5))).toBe(14);
  });

  it("stays within 3-18", () => {
    for (let i = 0; i < 200; i++) {
      const roll = roll4d6DropLowest();
      expect(roll).toBeGreaterThanOrEqual(3);
      expect(roll).toBeLessThanOrEqual(18);
    }
  });
});

describe("rollAbilityScores", () => {
  it("returns six scores sorted highest first", () => {
    const scores = rollAbilityScores();
    expect(scores).toHaveLength(6);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });
});

describe("normaliseCharacter", () => {
  it("fills missing fields with defaults", () => {
    expect(normaliseCharacter({})).toEqual(DEFAULT_CHARACTER);
  });

  it("keeps zero values rather than replacing them with defaults", () => {
    const character = normaliseCharacter({
      currentHitPoints: 0,
      temporaryHitPoints: 0,
    });
    expect(character.currentHitPoints).toBe(0);
  });

  it("ignores unknown fields", () => {
    const character = normaliseCharacter({
      userId: "abc",
    } as Record<string, unknown>);
    expect(character).not.toHaveProperty("userId");
  });
});

describe("skillModifier", () => {
  const stealth = SKILLS.find((s) => s.name === "Stealth")!;

  it("uses the governing ability modifier", () => {
    const character = { ...DEFAULT_CHARACTER, dexterity: 16 };
    expect(skillModifier(character, stealth)).toBe(3);
  });

  it("adds proficiency bonus when proficient", () => {
    const character = {
      ...DEFAULT_CHARACTER,
      dexterity: 16,
      proficiencyBonus: 3,
      skillProficiencies: ["Stealth"],
    };
    expect(skillModifier(character, stealth)).toBe(6);
  });
});

describe("savingThrowModifier", () => {
  const wisdom = ABILITIES.find((a) => a.key === "wisdom")!;

  it("adds proficiency bonus when proficient", () => {
    const character = {
      ...DEFAULT_CHARACTER,
      wisdom: 8,
      savingThrowProficiencies: ["WIS"],
    };
    expect(savingThrowModifier(character, wisdom)).toBe(1);
  });
});

describe("proficiencyBonusForLevel", () => {
  it.each([
    [1, 2],
    [4, 2],
    [5, 3],
    [9, 4],
    [13, 5],
    [17, 6],
    [20, 6],
  ])("level %i gives +%i", (level, bonus) => {
    expect(proficiencyBonusForLevel(level)).toBe(bonus);
  });
});

describe("derivedChanges", () => {
  it("moves proficiency bonus with level", () => {
    expect(derivedChanges(DEFAULT_CHARACTER, "level", 5)).toEqual({
      proficiencyBonus: 3,
    });
  });

  it("leaves an overridden proficiency bonus alone", () => {
    const character = { ...DEFAULT_CHARACTER, proficiencyBonus: 4 };
    expect(derivedChanges(character, "level", 5)).toEqual({});
  });

  it("moves initiative with DEX unless overridden", () => {
    expect(derivedChanges(DEFAULT_CHARACTER, "dexterity", 16)).toEqual({
      initiative: 3,
    });
    const alert = { ...DEFAULT_CHARACTER, initiative: 5 };
    expect(derivedChanges(alert, "dexterity", 16)).toEqual({});
  });

  it("ignores unrelated fields", () => {
    expect(derivedChanges(DEFAULT_CHARACTER, "characterName", "X")).toEqual({});
  });
});
