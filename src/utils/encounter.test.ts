import { describe, expect, it } from "vitest";
import {
  NEW_ENCOUNTER,
  addCombatants,
  formatChallengeRating,
  loadSrdMonsters,
  monsterInitiativeBonus,
  nextTurn,
  numberedNames,
  previousTurn,
  removeCombatant,
  updateCombatant,
} from "./encounter";
import type { Combatant, Encounter } from "./encounter";

const c = (id: string, initiative: number): Combatant => ({
  id,
  name: id,
  initiative,
  kind: "monster",
});

const order = (e: Encounter) => e.combatants.map((x) => x.id);
const current = (e: Encounter) => e.combatants[e.turn].id;

describe("adding and sorting", () => {
  it("sorts by initiative, keeping ties in the order added", () => {
    const e = addCombatants(NEW_ENCOUNTER, [
      c("a", 10),
      c("b", 18),
      c("c", 10),
    ]);
    expect(order(e)).toEqual(["b", "a", "c"]);
  });

  it("starts with the highest initiative before anyone has acted", () => {
    let e = addCombatants(NEW_ENCOUNTER, [c("pc", 14)]);
    e = addCombatants(e, [c("goblin", 18)]);
    expect(current(e)).toBe("goblin");
  });

  it("keeps the current turn when someone joins ahead of it", () => {
    let e = addCombatants(NEW_ENCOUNTER, [c("a", 15), c("b", 10)]);
    e = nextTurn(e);
    expect(current(e)).toBe("b");

    e = addCombatants(e, [c("late", 20)]);
    expect(current(e)).toBe("b");
  });

  it("re-sorts when an initiative is corrected mid-combat", () => {
    const started = nextTurn(
      addCombatants(NEW_ENCOUNTER, [c("a", 15), c("b", 10), c("x", 5)])
    ); // b's turn
    const e = updateCombatant(started, "x", { initiative: 19 });
    expect(order(e)).toEqual(["x", "a", "b"]);
    expect(current(e)).toBe("b");
  });
});

describe("turns", () => {
  const start = addCombatants(NEW_ENCOUNTER, [c("a", 15), c("b", 10)]);

  it("advances and starts a new round after the last combatant", () => {
    const e = nextTurn(nextTurn(start));
    expect(current(e)).toBe("a");
    expect(e.round).toBe(2);
  });

  it("goes back, including into the previous round", () => {
    const e = previousTurn(nextTurn(nextTurn(start)));
    expect(current(e)).toBe("b");
    expect(e.round).toBe(1);
  });

  it("doesn't go back past the start", () => {
    expect(previousTurn(start)).toEqual(start);
  });
});

describe("removeCombatant", () => {
  const e = nextTurn(
    addCombatants(NEW_ENCOUNTER, [c("a", 20), c("b", 15), c("c", 10)])
  ); // b's turn

  it("keeps the current combatant when someone earlier leaves", () => {
    expect(current(removeCombatant(e, "a"))).toBe("b");
  });

  it("passes the turn on when the current combatant leaves", () => {
    expect(current(removeCombatant(e, "b"))).toBe("c");
  });

  it("wraps to the top when the last combatant leaves on their turn", () => {
    const last = nextTurn(e);
    expect(current(removeCombatant(last, "c"))).toBe("a");
  });
});

describe("numberedNames", () => {
  it("numbers duplicates, skipping names already in use", () => {
    expect(numberedNames("Goblin", 1, [])).toEqual(["Goblin"]);
    expect(numberedNames("Goblin", 2, [])).toEqual(["Goblin 1", "Goblin 2"]);
    expect(numberedNames("Goblin", 2, [c("Goblin 1", 5)])).toEqual([
      "Goblin 2",
      "Goblin 3",
    ]);
  });
});

describe("SRD monsters", () => {
  it("has stats for initiative and the tracker", async () => {
    const goblin = (await loadSrdMonsters()).find((m) => m.name === "Goblin")!;
    expect(goblin).toMatchObject({ armorClass: 15, hitPoints: 7 });
    expect(monsterInitiativeBonus(goblin)).toBe(2);
    expect(formatChallengeRating(goblin.challengeRating)).toBe("1/4");
  });
});
