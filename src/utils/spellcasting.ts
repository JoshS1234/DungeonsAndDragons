import classTables from "../data/srd/classes.json";
import { ABILITIES, calculateModifier, proficiencyBonusForLevel } from "./dnd";
import type { AbilityAbbrev, CharacterData } from "./dnd";

export interface Spell {
  index: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  description: string;
  higherLevel: string;
  damage?: Array<{
    type?: string;
    atSlotLevel?: Record<string, string>;
    atCharacterLevel?: Record<string, string>;
  }>;
  healAtSlotLevel?: Record<string, string>;
  save?: { ability: string; onSuccess: string };
  attackType?: string;
  classes: string[];
}

/** A spell on a character: from the SRD (by index) or entered by hand. */
export interface KnownSpell {
  name: string;
  level: number;
  /** SRD spell index; absent for custom spells. */
  srdIndex?: string;
  prepared: boolean;
  /** Free-text details for custom spells. */
  notes?: string;
}

// Classes that prepare spells from their whole list each day
const PREPARED_CASTERS: Record<string, "full" | "half"> = {
  Cleric: "full",
  Druid: "full",
  Wizard: "full",
  Paladin: "half",
};

type ClassTable = {
  ability: string | null;
  levels: Array<{
    level: number;
    profBonus: number;
    cantripsKnown: number;
    spellsKnown: number | null;
    slots: number[];
  }>;
};

const TABLES = classTables as Record<string, ClassTable>;

export interface Spellcasting {
  ability: AbilityAbbrev;
  /** Slots per spell level, index 0 = 1st level. */
  slots: number[];
  maxSpellLevel: number;
  cantripsKnown: number;
  /** For "known" casters (Bard, Ranger, Sorcerer, Warlock). */
  spellsKnown: number | null;
  /** For "prepared" casters (Cleric, Druid, Paladin, Wizard). */
  preparedLimit: number | null;
  saveDC: number;
  attackBonus: number;
}

/** Spellcasting stats for a character, or null if their class can't cast. */
export const spellcastingFor = (
  character: Pick<CharacterData, "class" | "level" | "proficiencyBonus"> &
    Partial<CharacterData>
): Spellcasting | null => {
  const table = TABLES[character.class];
  if (!table?.ability) return null;

  const level = Math.min(Math.max(character.level, 1), 20);
  const row = table.levels[level - 1];
  // Paladins and Rangers get spells from level 2
  if (row.slots.every((n) => n === 0) && row.cantripsKnown === 0) return null;

  const ability = table.ability as AbilityAbbrev;
  const abilityKey = ABILITIES.find((a) => a.abbrev === ability)!.key;
  const modifier = calculateModifier(character[abilityKey] ?? 10);
  const proficiency =
    character.proficiencyBonus ?? proficiencyBonusForLevel(level);

  const prepared = PREPARED_CASTERS[character.class];
  const preparedLimit = prepared
    ? Math.max(
        1,
        modifier + (prepared === "full" ? level : Math.floor(level / 2))
      )
    : null;

  return {
    ability,
    slots: row.slots,
    maxSpellLevel: row.slots.reduce((max, n, i) => (n > 0 ? i + 1 : max), 0),
    cantripsKnown: row.cantripsKnown,
    spellsKnown: row.spellsKnown,
    preparedLimit,
    saveDC: 8 + proficiency + modifier,
    attackBonus: proficiency + modifier,
  };
};

export const SPELL_LEVEL_NAMES = [
  "Cantrips",
  "1st level",
  "2nd level",
  "3rd level",
  "4th level",
  "5th level",
  "6th level",
  "7th level",
  "8th level",
  "9th level",
];

/** Counts to show against the character's limits. */
export const spellCounts = (spells: KnownSpell[]) => ({
  cantrips: spells.filter((s) => s.level === 0).length,
  leveled: spells.filter((s) => s.level > 0).length,
  prepared: spells.filter((s) => s.level > 0 && s.prepared).length,
});

let spellsPromise: Promise<Spell[]> | null = null;

/** The SRD spell list, loaded on first use (it's ~375 kB). */
export const loadSrdSpells = (): Promise<Spell[]> => {
  spellsPromise ??= import("../data/srd/spells.json").then(
    (module) => module.default as Spell[]
  );
  return spellsPromise;
};
