// Shared D&D 5e reference data and rules helpers.

import { rollDie } from "./dice";
import type { KnownSpell } from "./spellcasting";
import type { Attack, Currency, InventoryItem } from "./inventory";

export const ABILITIES = [
  { name: "Strength", key: "strength", abbrev: "STR" },
  { name: "Dexterity", key: "dexterity", abbrev: "DEX" },
  { name: "Constitution", key: "constitution", abbrev: "CON" },
  { name: "Intelligence", key: "intelligence", abbrev: "INT" },
  { name: "Wisdom", key: "wisdom", abbrev: "WIS" },
  { name: "Charisma", key: "charisma", abbrev: "CHA" },
] as const;

export type Ability = (typeof ABILITIES)[number];
export type AbilityKey = Ability["key"];
export type AbilityAbbrev = Ability["abbrev"];

export const SKILLS: ReadonlyArray<{ name: string; ability: AbilityAbbrev }> = [
  { name: "Acrobatics", ability: "DEX" },
  { name: "Animal Handling", ability: "WIS" },
  { name: "Arcana", ability: "INT" },
  { name: "Athletics", ability: "STR" },
  { name: "Deception", ability: "CHA" },
  { name: "History", ability: "INT" },
  { name: "Insight", ability: "WIS" },
  { name: "Intimidation", ability: "CHA" },
  { name: "Investigation", ability: "INT" },
  { name: "Medicine", ability: "WIS" },
  { name: "Nature", ability: "INT" },
  { name: "Perception", ability: "WIS" },
  { name: "Performance", ability: "CHA" },
  { name: "Persuasion", ability: "CHA" },
  { name: "Religion", ability: "INT" },
  { name: "Sleight of Hand", ability: "DEX" },
  { name: "Stealth", ability: "DEX" },
  { name: "Survival", ability: "WIS" },
];

export const CLASSES = [
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
];

export const RACES = [
  "Dragonborn",
  "Dwarf",
  "Elf",
  "Gnome",
  "Half-Elf",
  "Half-Orc",
  "Halfling",
  "Human",
  "Tiefling",
];

export const ALIGNMENTS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
];

export interface CharacterData {
  // Basic Information
  characterName: string;
  class: string;
  level: number;
  background: string;
  playerName: string;
  race: string;
  alignment: string;
  experiencePoints: number;

  // Ability Scores
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;

  // Combat Stats
  armorClass: number;
  initiative: number;
  speed: number;
  maxHitPoints: number;
  currentHitPoints: number;
  temporaryHitPoints: number;
  hitDice: string;

  // Session state (play mode)
  deathSaveSuccesses: number;
  deathSaveFailures: number;
  /** Slots used per spell level, index 0 = 1st level. */
  spellSlotsUsed: number[];
  conditions: string[];
  inspiration: boolean;

  // Proficiency
  proficiencyBonus: number;
  savingThrowProficiencies: string[];
  skillProficiencies: string[];

  // Other
  personalityTraits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  characterAppearance: string;
  alliesAndOrganizations: string;
  additionalFeaturesAndTraits: string;
  /** Free-text equipment notes (shown as "Other equipment"). */
  equipment: string;
  inventory: InventoryItem[];
  attacks: Attack[];
  currency: Currency;
  proficienciesAndLanguages: string;
  /** Free-text spell notes (shown as "Spell notes"). */
  spells: string;
  knownSpells: KnownSpell[];
  campaignIds: string[];
}

export const DEFAULT_CHARACTER: CharacterData = {
  characterName: "",
  class: "",
  level: 1,
  background: "",
  playerName: "",
  race: "",
  alignment: "",
  experiencePoints: 0,

  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,

  armorClass: 10,
  initiative: 0,
  speed: 30,
  maxHitPoints: 8,
  currentHitPoints: 8,
  temporaryHitPoints: 0,
  hitDice: "1d8",

  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  spellSlotsUsed: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  conditions: [],
  inspiration: false,

  proficiencyBonus: 2,
  savingThrowProficiencies: [],
  skillProficiencies: [],

  personalityTraits: "",
  ideals: "",
  bonds: "",
  flaws: "",
  characterAppearance: "",
  alliesAndOrganizations: "",
  additionalFeaturesAndTraits: "",
  equipment: "",
  inventory: [],
  attacks: [],
  currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
  proficienciesAndLanguages: "",
  spells: "",
  knownSpells: [],
  campaignIds: [],
};

/**
 * Fill in any fields missing from a stored character with defaults.
 * Uses `??` rather than `||` so legitimate zero values (e.g. 0 current HP)
 * are preserved.
 */
export const normaliseCharacter = (
  raw: Partial<Record<keyof CharacterData, unknown>>
): CharacterData => {
  const result = { ...DEFAULT_CHARACTER };
  for (const key of Object.keys(DEFAULT_CHARACTER) as (keyof CharacterData)[]) {
    const value = raw[key];
    if (value !== undefined && value !== null) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
};

/** 5e proficiency bonus: +2 at levels 1-4, rising by 1 every 4 levels. */
export const proficiencyBonusForLevel = (level: number): number =>
  2 + Math.floor((Math.min(Math.max(level, 1), 20) - 1) / 4);

/**
 * Fields that should follow another field when it changes, unless the user
 * has overridden them: proficiency bonus follows level, initiative follows
 * DEX.
 */
export const derivedChanges = <K extends keyof CharacterData>(
  character: CharacterData,
  key: K,
  value: CharacterData[K]
): Partial<CharacterData> => {
  if (
    key === "level" &&
    character.proficiencyBonus === proficiencyBonusForLevel(character.level)
  ) {
    return { proficiencyBonus: proficiencyBonusForLevel(value as number) };
  }
  if (
    key === "dexterity" &&
    character.initiative === calculateModifier(character.dexterity)
  ) {
    return { initiative: calculateModifier(value as number) };
  }
  return {};
};

export const calculateModifier = (score: number): number =>
  Math.floor((score - 10) / 2);

export const formatModifier = (modifier: number): string =>
  modifier >= 0 ? `+${modifier}` : `${modifier}`;

export const abilityScoreFor = (
  character: CharacterData,
  abbrev: AbilityAbbrev
): number => {
  const ability = ABILITIES.find((a) => a.abbrev === abbrev)!;
  return character[ability.key];
};

export const skillModifier = (
  character: CharacterData,
  skill: (typeof SKILLS)[number]
): number =>
  calculateModifier(abilityScoreFor(character, skill.ability)) +
  (character.skillProficiencies.includes(skill.name)
    ? character.proficiencyBonus
    : 0);

export const savingThrowModifier = (
  character: CharacterData,
  ability: Ability
): number =>
  calculateModifier(character[ability.key]) +
  (character.savingThrowProficiencies.includes(ability.abbrev)
    ? character.proficiencyBonus
    : 0);

export const roll4d6DropLowest = (
  random: () => number = Math.random
): number => {
  const rolls = Array.from({ length: 4 }, () => rollDie(6, random));
  rolls.sort((a, b) => b - a);
  return rolls[0] + rolls[1] + rolls[2];
};

/** Six ability scores via 4d6-drop-lowest, sorted highest first. */
export const rollAbilityScores = (
  random: () => number = Math.random
): number[] =>
  Array.from({ length: 6 }, () => roll4d6DropLowest(random)).sort(
    (a, b) => b - a
  );
