import { describe, expect, it } from "vitest";
import { DiceError, checkExpression, parseDice, rollDice } from "./dice";

/** A fake Math.random that yields each die face in turn (for any die). */
const faces = (sides: number, ...values: number[]) => {
  let i = 0;
  return () => (values[i++ % values.length] - 1) / sides;
};

describe("parseDice", () => {
  it("parses dice and flat modifiers", () => {
    expect(parseDice("2d6 + 1d4 - 3")).toEqual([
      { kind: "dice", sign: 1, count: 2, sides: 6 },
      { kind: "dice", sign: 1, count: 1, sides: 4 },
      { kind: "flat", sign: -1, value: 3 },
    ]);
  });

  it("treats d20 as 1d20 and ignores case", () => {
    expect(parseDice("D20")).toEqual([
      { kind: "dice", sign: 1, count: 1, sides: 20 },
    ]);
  });

  it.each(["", "abc", "2d", "d6d6", "2d6 3", "2d6++3"])(
    "rejects %j",
    (input) => {
      expect(() => parseDice(input)).toThrow(DiceError);
    }
  );

  it("rejects silly sizes", () => {
    expect(() => parseDice("1000d6")).toThrow("1 to 100 dice");
    expect(() => parseDice("1d1")).toThrow("between 2 and 1000 sides");
  });
});

describe("rollDice", () => {
  it("adds up dice and modifiers", () => {
    const result = rollDice("2d6+3", "normal", faces(6, 4, 5));
    expect(result.total).toBe(12);
    expect(result.terms[0]).toMatchObject({ rolls: [4, 5], dropped: [] });
  });

  it("subtracts negative terms", () => {
    expect(rollDice("1d6-1d6", "normal", faces(6, 6, 2)).total).toBe(4);
  });

  it("keeps the higher d20 with advantage", () => {
    const result = rollDice("1d20+2", "advantage", faces(20, 7, 15));
    expect(result.total).toBe(17);
    expect(result.natural).toBe(15);
    expect(result.terms[0]).toMatchObject({ rolls: [15], dropped: [7] });
  });

  it("keeps the lower d20 with disadvantage", () => {
    const result = rollDice("1d20", "disadvantage", faces(20, 7, 15));
    expect(result.total).toBe(7);
  });

  it("ignores advantage when there's no single d20", () => {
    const result = rollDice("2d6", "advantage", faces(6, 1, 2));
    expect(result.total).toBe(3);
    expect(result.natural).toBeUndefined();
  });

  it("reports natural 20s", () => {
    expect(rollDice("1d20+5", "normal", faces(20, 20)).natural).toBe(20);
  });

  it("stays within range", () => {
    for (let i = 0; i < 500; i++) {
      const { total } = rollDice("3d6");
      expect(total).toBeGreaterThanOrEqual(3);
      expect(total).toBeLessThanOrEqual(18);
    }
  });
});

describe("checkExpression", () => {
  it.each([
    [3, "1d20+3"],
    [0, "1d20"],
    [-1, "1d20-1"],
  ])("modifier %i gives %s", (modifier, expected) => {
    expect(checkExpression(modifier)).toBe(expected);
  });
});
