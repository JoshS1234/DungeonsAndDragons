import { describe, expect, it } from "vitest";
import {
  NO_SLOTS_USED,
  applyDamage,
  applyDeathSave,
  applyHealing,
  applyTemporaryHitPoints,
  deathState,
  hitDieExpression,
  longRest,
  shortRest,
} from "./play";

const vitals = (overrides = {}) => ({
  currentHitPoints: 10,
  maxHitPoints: 12,
  temporaryHitPoints: 0,
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  ...overrides,
});

describe("applyDamage", () => {
  it("reduces hit points, not below zero", () => {
    expect(applyDamage(vitals(), 4)).toMatchObject({ currentHitPoints: 6 });
    expect(applyDamage(vitals(), 40)).toMatchObject({ currentHitPoints: 0 });
  });

  it("uses temporary hit points first", () => {
    expect(applyDamage(vitals({ temporaryHitPoints: 5 }), 7)).toEqual({
      temporaryHitPoints: 0,
      currentHitPoints: 8,
    });
    expect(applyDamage(vitals({ temporaryHitPoints: 5 }), 3)).toEqual({
      temporaryHitPoints: 2,
      currentHitPoints: 10,
    });
  });

  it("counts damage at 0 HP as a failed death save", () => {
    expect(
      applyDamage(vitals({ currentHitPoints: 0, deathSaveFailures: 1 }), 3)
    ).toEqual({ deathSaveFailures: 2 });
  });

  it("ignores zero or negative amounts", () => {
    expect(applyDamage(vitals(), 0)).toEqual({});
  });
});

describe("applyHealing", () => {
  it("heals up to max HP", () => {
    expect(applyHealing(vitals(), 5)).toEqual({ currentHitPoints: 12 });
  });

  it("resets death saves when healed from 0", () => {
    expect(
      applyHealing(
        vitals({
          currentHitPoints: 0,
          deathSaveSuccesses: 2,
          deathSaveFailures: 1,
        }),
        3
      )
    ).toEqual({
      currentHitPoints: 3,
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
    });
  });
});

describe("applyTemporaryHitPoints", () => {
  it("keeps the higher value rather than stacking", () => {
    expect(
      applyTemporaryHitPoints(vitals({ temporaryHitPoints: 5 }), 3)
    ).toEqual({ temporaryHitPoints: 5 });
    expect(
      applyTemporaryHitPoints(vitals({ temporaryHitPoints: 5 }), 8)
    ).toEqual({ temporaryHitPoints: 8 });
  });
});

describe("death saves", () => {
  const dying = vitals({ currentHitPoints: 0 });

  it.each([
    [10, { deathSaveSuccesses: 1 }],
    [9, { deathSaveFailures: 1 }],
    [1, { deathSaveFailures: 2 }],
    [20, { currentHitPoints: 1, deathSaveSuccesses: 0, deathSaveFailures: 0 }],
  ])("a natural %i gives %j", (natural, expected) => {
    expect(applyDeathSave(dying, natural)).toEqual(expected);
  });

  it("caps at three", () => {
    expect(applyDeathSave(vitals({ deathSaveFailures: 2 }), 1)).toEqual({
      deathSaveFailures: 3,
    });
  });

  it.each([
    [vitals(), "alive"],
    [dying, "dying"],
    [vitals({ currentHitPoints: 0, deathSaveSuccesses: 3 }), "stable"],
    [vitals({ currentHitPoints: 0, deathSaveFailures: 3 }), "dead"],
  ] as const)("%j is %s", (state, expected) => {
    expect(deathState(state)).toBe(expected);
  });
});

describe("rests", () => {
  it("a long rest restores HP and spell slots", () => {
    expect(
      longRest(vitals({ temporaryHitPoints: 4, deathSaveFailures: 2 }))
    ).toEqual({
      currentHitPoints: 12,
      temporaryHitPoints: 0,
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
      spellSlotsUsed: NO_SLOTS_USED,
    });
  });

  it("a short rest restores warlock slots only", () => {
    expect(shortRest({ class: "Warlock" })).toEqual({
      spellSlotsUsed: NO_SLOTS_USED,
    });
    expect(shortRest({ class: "Wizard" })).toEqual({});
  });
});

describe("hitDieExpression", () => {
  it.each([
    [{ hitDice: "3d10", constitution: 14 }, "1d10+2"],
    [{ hitDice: "1d8", constitution: 10 }, "1d8"],
    [{ hitDice: "2d6", constitution: 8 }, "1d6-1"],
    [{ hitDice: "", constitution: 10 }, "1d8"],
  ])("%j rolls %s", (c, expected) => {
    expect(hitDieExpression(c)).toBe(expected);
  });
});
