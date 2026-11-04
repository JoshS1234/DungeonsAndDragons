// In-session rules: damage, healing, death saves, rests.
import { calculateModifier } from "./dnd";
import type { CharacterData } from "./dnd";

export const CONDITIONS = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
];

type Vitals = Pick<
  CharacterData,
  | "currentHitPoints"
  | "maxHitPoints"
  | "temporaryHitPoints"
  | "deathSaveSuccesses"
  | "deathSaveFailures"
>;

/**
 * Temporary hit points absorb damage first. Taking damage while already at
 * 0 HP counts as a failed death save.
 */
export const applyDamage = (
  c: Vitals,
  amount: number
): Partial<CharacterData> => {
  if (amount <= 0) return {};
  if (c.currentHitPoints === 0) {
    return { deathSaveFailures: Math.min(3, c.deathSaveFailures + 1) };
  }
  const absorbed = Math.min(c.temporaryHitPoints, amount);
  return {
    temporaryHitPoints: c.temporaryHitPoints - absorbed,
    currentHitPoints: Math.max(0, c.currentHitPoints - (amount - absorbed)),
  };
};

/** Healing can't exceed max HP; any healing at 0 HP resets death saves. */
export const applyHealing = (c: Vitals, amount: number) => {
  if (amount <= 0) return {};
  return {
    currentHitPoints: Math.min(c.maxHitPoints, c.currentHitPoints + amount),
    ...(c.currentHitPoints === 0 && {
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
    }),
  };
};

/** Temporary HP doesn't stack: keep whichever is higher. */
export const applyTemporaryHitPoints = (c: Vitals, amount: number) => ({
  temporaryHitPoints: Math.max(c.temporaryHitPoints, amount),
});

export type DeathState = "alive" | "dying" | "stable" | "dead";

export const deathState = (c: Vitals): DeathState => {
  if (c.currentHitPoints > 0) return "alive";
  if (c.deathSaveFailures >= 3) return "dead";
  if (c.deathSaveSuccesses >= 3) return "stable";
  return "dying";
};

/**
 * A death saving throw result (natural d20): 10+ succeeds, a natural 20
 * brings you back with 1 HP, a natural 1 counts as two failures.
 */
export const applyDeathSave = (
  c: Vitals,
  natural: number
): Partial<CharacterData> => {
  if (natural === 20) {
    return { currentHitPoints: 1, deathSaveSuccesses: 0, deathSaveFailures: 0 };
  }
  if (natural >= 10) {
    return { deathSaveSuccesses: Math.min(3, c.deathSaveSuccesses + 1) };
  }
  return {
    deathSaveFailures: Math.min(
      3,
      c.deathSaveFailures + (natural === 1 ? 2 : 1)
    ),
  };
};

export const NO_SLOTS_USED = [0, 0, 0, 0, 0, 0, 0, 0, 0];

export const longRest = (c: Vitals): Partial<CharacterData> => ({
  currentHitPoints: c.maxHitPoints,
  temporaryHitPoints: 0,
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  spellSlotsUsed: NO_SLOTS_USED,
});

/** Warlocks get their pact magic slots back on a short rest. */
export const shortRest = (
  c: Pick<CharacterData, "class">
): Partial<CharacterData> =>
  c.class === "Warlock" ? { spellSlotsUsed: NO_SLOTS_USED } : {};

/** One Hit Die plus CON modifier, e.g. "1d8+2", for healing on a short rest. */
export const hitDieExpression = (
  c: Pick<CharacterData, "hitDice" | "constitution">
) => {
  const sides = Number(/d(\d+)/i.exec(c.hitDice)?.[1] ?? 8);
  const con = calculateModifier(c.constitution);
  return `1d${sides}${con === 0 ? "" : con > 0 ? `+${con}` : con}`;
};
