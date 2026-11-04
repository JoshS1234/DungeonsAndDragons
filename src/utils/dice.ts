// Dice expressions like "2d6+3", "d20", "1d8+1d6-1".

export type RollMode = "normal" | "advantage" | "disadvantage";

export interface DiceTerm {
  kind: "dice";
  sign: 1 | -1;
  count: number;
  sides: number;
}

export interface FlatTerm {
  kind: "flat";
  sign: 1 | -1;
  value: number;
}

export type Term = DiceTerm | FlatTerm;

export interface RolledDice extends DiceTerm {
  rolls: number[];
  /** Rolls discarded by advantage/disadvantage. */
  dropped: number[];
}

export type RolledTerm = RolledDice | FlatTerm;

export interface RollResult {
  expression: string;
  mode: RollMode;
  terms: RolledTerm[];
  total: number;
  /** The kept d20 for a single-d20 roll, to spot natural 1s and 20s. */
  natural?: number;
}

export class DiceError extends Error {}

const MAX_DICE = 100;
const MAX_SIDES = 1000;

/** Parse an expression such as "2d6 + 1d4 - 1" into terms. */
export const parseDice = (expression: string): Term[] => {
  // Spaces are allowed around + and - only, so "2d6 3" isn't read as "2d63"
  const source = expression
    .trim()
    .toLowerCase()
    .replace(/\s*([+-])\s*/g, "$1");
  if (!source) throw new DiceError("Enter a roll, like 2d6+3.");
  if (/\s/.test(source)) {
    throw new DiceError(`Couldn't understand "${expression}".`);
  }

  const pattern = /([+-]?)(?:(\d*)d(\d+)|(\d+))/y;
  const terms: Term[] = [];
  let index = 0;

  while (index < source.length) {
    pattern.lastIndex = index;
    const match = pattern.exec(source);
    if (!match || (terms.length > 0 && !match[1])) {
      throw new DiceError(`Couldn't understand "${expression}".`);
    }
    index = pattern.lastIndex;

    const sign = match[1] === "-" ? -1 : 1;
    if (match[3] !== undefined) {
      const count = match[2] === "" ? 1 : Number(match[2]);
      const sides = Number(match[3]);
      if (count < 1 || count > MAX_DICE) {
        throw new DiceError(`You can roll 1 to ${MAX_DICE} dice at a time.`);
      }
      if (sides < 2 || sides > MAX_SIDES) {
        throw new DiceError(`Dice need between 2 and ${MAX_SIDES} sides.`);
      }
      terms.push({ kind: "dice", sign, count, sides });
    } else {
      terms.push({ kind: "flat", sign, value: Number(match[4]) });
    }
  }

  return terms;
};

export const rollDie = (sides: number, random: () => number = Math.random) =>
  Math.floor(random() * sides) + 1;

const isSingleD20 = (term: Term): term is DiceTerm =>
  term.kind === "dice" && term.count === 1 && term.sides === 20;

/**
 * Roll an expression. Advantage/disadvantage applies to the first single
 * d20 in the expression (roll two, keep the higher/lower).
 */
export const rollDice = (
  expression: string,
  mode: RollMode = "normal",
  random: () => number = Math.random
): RollResult => {
  const terms = parseDice(expression);
  const d20Index = terms.findIndex(isSingleD20);
  let natural: number | undefined;

  const rolled = terms.map((term, i): RolledTerm => {
    if (term.kind === "flat") return term;

    if (i === d20Index && mode !== "normal") {
      const pair = [rollDie(20, random), rollDie(20, random)];
      const keep = mode === "advantage" ? Math.max(...pair) : Math.min(...pair);
      const dropped = pair[0] === keep ? pair[1] : pair[0];
      natural = keep;
      return { ...term, rolls: [keep], dropped: [dropped] };
    }

    const rolls = Array.from({ length: term.count }, () =>
      rollDie(term.sides, random)
    );
    if (i === d20Index) natural = rolls[0];
    return { ...term, rolls, dropped: [] };
  });

  const total = rolled.reduce(
    (sum, term) =>
      sum +
      term.sign *
        (term.kind === "flat"
          ? term.value
          : term.rolls.reduce((a, b) => a + b, 0)),
    0
  );

  // Only call out naturals when the d20 is the point of the roll
  const singleD20 = terms.filter(isSingleD20).length === 1;
  return {
    expression,
    mode,
    terms: rolled,
    total,
    natural: singleD20 ? natural : undefined,
  };
};

/** "1d20+5" style expression for an ability check, save or skill. */
export const checkExpression = (modifier: number) =>
  modifier === 0
    ? "1d20"
    : `1d20${modifier > 0 ? "+" : "-"}${Math.abs(modifier)}`;
