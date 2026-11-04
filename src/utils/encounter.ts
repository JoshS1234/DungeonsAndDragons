// Initiative tracking. Combatants are kept sorted by initiative (highest
// first) and `turn` is the index of whoever is acting.
import { calculateModifier } from "./dnd";

export interface Combatant {
  id: string;
  name: string;
  initiative: number;
  kind: "pc" | "monster";
  /** For player characters: their character document. */
  characterId?: string;
  /** Monsters only: player characters' HP lives on their own sheet. */
  hitPoints?: number;
  maxHitPoints?: number;
  armorClass?: number;
  /** SRD monster index, for the stat block. */
  srdIndex?: string;
}

export interface Encounter {
  round: number;
  turn: number;
  combatants: Combatant[];
}

export const NEW_ENCOUNTER: Encounter = { round: 1, turn: 0, combatants: [] };

export interface Monster {
  index: string;
  name: string;
  size: string;
  type: string;
  alignment: string;
  armorClass: number;
  hitPoints: number;
  hitDice: string;
  speed: string;
  /** STR, DEX, CON, INT, WIS, CHA. */
  abilities: number[];
  challengeRating: number;
  xp: number;
  traits: Array<{ name: string; description: string }>;
  actions: Array<{ name: string; description: string }>;
}

export const monsterInitiativeBonus = (monster: Monster) =>
  calculateModifier(monster.abilities[1]);

/** "1/4" rather than 0.25. */
export const formatChallengeRating = (cr: number) =>
  ({ 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" })[cr] ?? String(cr);

// Ties keep their existing order, so re-sorting doesn't shuffle them
const sortByInitiative = (combatants: Combatant[]) =>
  combatants
    .map((c, i) => ({ c, i }))
    .sort((a, b) => b.c.initiative - a.c.initiative || a.i - b.i)
    .map(({ c }) => c);

/**
 * Re-sort after changes. Before anyone has acted, the highest initiative
 * goes first; once combat is under way the same combatant keeps the turn.
 */
const resort = (encounter: Encounter, combatants: Combatant[]): Encounter => {
  const sorted = sortByInitiative(combatants);
  if (encounter.round === 1 && encounter.turn === 0) {
    return { ...encounter, combatants: sorted, turn: 0 };
  }
  const current = encounter.combatants[encounter.turn]?.id;
  const turn = sorted.findIndex((c) => c.id === current);
  return { ...encounter, combatants: sorted, turn: Math.max(0, turn) };
};

export const addCombatants = (
  encounter: Encounter,
  added: Combatant[]
): Encounter => resort(encounter, [...encounter.combatants, ...added]);

export const updateCombatant = (
  encounter: Encounter,
  id: string,
  change: Partial<Combatant>
): Encounter =>
  resort(
    encounter,
    encounter.combatants.map((c) => (c.id === id ? { ...c, ...change } : c))
  );

export const removeCombatant = (
  encounter: Encounter,
  id: string
): Encounter => {
  const index = encounter.combatants.findIndex((c) => c.id === id);
  const combatants = encounter.combatants.filter((c) => c.id !== id);
  // Removing someone before the current turn shifts the turn back one;
  // removing the current combatant passes the turn to the next in line
  let turn = encounter.turn;
  if (index < turn) turn -= 1;
  if (turn >= combatants.length) turn = 0;
  return { ...encounter, combatants, turn };
};

export const nextTurn = (encounter: Encounter): Encounter => {
  if (encounter.combatants.length === 0) return encounter;
  const wraps = encounter.turn + 1 >= encounter.combatants.length;
  return {
    ...encounter,
    turn: wraps ? 0 : encounter.turn + 1,
    round: wraps ? encounter.round + 1 : encounter.round,
  };
};

export const previousTurn = (encounter: Encounter): Encounter => {
  if (encounter.combatants.length === 0) return encounter;
  if (encounter.turn > 0) return { ...encounter, turn: encounter.turn - 1 };
  if (encounter.round === 1) return encounter;
  return {
    ...encounter,
    turn: encounter.combatants.length - 1,
    round: encounter.round - 1,
  };
};

/** Numbered names for several of the same monster: "Goblin 1", "Goblin 2". */
export const numberedNames = (
  name: string,
  count: number,
  existing: Combatant[]
) => {
  if (count === 1 && !existing.some((c) => c.name === name)) return [name];
  let next = 1;
  const names: string[] = [];
  while (names.length < count) {
    const candidate = `${name} ${next++}`;
    if (!existing.some((c) => c.name === candidate)) names.push(candidate);
  }
  return names;
};

let monstersPromise: Promise<Monster[]> | null = null;

/** The SRD monster list, loaded on first use (~390 kB). */
export const loadSrdMonsters = (): Promise<Monster[]> => {
  monstersPromise ??= import("../data/srd/monsters.json").then(
    (module) => module.default as Monster[]
  );
  return monstersPromise;
};
