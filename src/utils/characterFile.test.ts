import { describe, expect, it } from "vitest";
import { DEFAULT_CHARACTER } from "./dnd";
import { parseCharacterFile, toCharacterFile } from "./characterFile";

const thalia = {
  ...DEFAULT_CHARACTER,
  characterName: "Thalia",
  class: "Rogue",
  level: 5,
  currentHitPoints: 0,
  knownSpells: [{ name: "Light", level: 0, prepared: true }],
  campaignIds: ["camp-1"],
};

describe("character files", () => {
  it("round-trips a character, dropping campaign links", () => {
    expect(parseCharacterFile(toCharacterFile(thalia))).toEqual({
      ...thalia,
      campaignIds: [],
    });
  });

  it("rejects things that aren't character files", () => {
    expect(() => parseCharacterFile("not json")).toThrow("isn't valid JSON");
    expect(() => parseCharacterFile('{"hello": 1}')).toThrow(
      "doesn't look like a character file"
    );
    expect(() =>
      parseCharacterFile(
        JSON.stringify({ format: "dnd-character", character: {} })
      )
    ).toThrow("has no name");
  });

  it("replaces wrongly typed fields with defaults", () => {
    const file = JSON.stringify({
      format: "dnd-character",
      version: 1,
      character: {
        characterName: "Vex",
        level: "high",
        strength: null,
        knownSpells: "lots",
      },
    });
    const character = parseCharacterFile(file);
    expect(character.level).toBe(1);
    expect(character.strength).toBe(10);
    expect(character.knownSpells).toEqual([]);
  });

  it("clamps values to what the app accepts", () => {
    const file = JSON.stringify({
      format: "dnd-character",
      version: 1,
      character: { characterName: "x".repeat(150), level: 37 },
    });
    const character = parseCharacterFile(file);
    expect(character.characterName).toHaveLength(100);
    expect(character.level).toBe(20);
  });

  it("ignores unknown fields", () => {
    const file = JSON.stringify({
      format: "dnd-character",
      version: 1,
      character: { characterName: "Vex", userId: "someone-else" },
    });
    expect(parseCharacterFile(file)).not.toHaveProperty("userId");
  });
});
