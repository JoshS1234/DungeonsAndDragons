import { describe, expect, it } from "vitest";
import { parseBudgetMessage, shouldDisableBilling } from "./budget.js";

const encode = (message) =>
  Buffer.from(JSON.stringify(message)).toString("base64");

describe("billing cut-off", () => {
  it("reads Cloud Billing's budget notification", () => {
    const message = encode({
      budgetDisplayName: "D&D cut-off",
      costAmount: 1.23,
      costIntervalStart: "2026-10-01T07:00:00Z",
      budgetAmount: 1.0,
      budgetAmountType: "SPECIFIED_AMOUNT",
      currencyCode: "GBP",
    });
    expect(parseBudgetMessage(message)).toEqual({
      costAmount: 1.23,
      budgetAmount: 1,
      currencyCode: "GBP",
    });
  });

  it("only cuts billing once the budget is exceeded", () => {
    expect(shouldDisableBilling({ costAmount: 0, budgetAmount: 1 })).toBe(
      false
    );
    expect(shouldDisableBilling({ costAmount: 1, budgetAmount: 1 })).toBe(
      false
    );
    expect(shouldDisableBilling({ costAmount: 1.01, budgetAmount: 1 })).toBe(
      true
    );
  });

  it("does nothing with a malformed message", () => {
    expect(shouldDisableBilling({ costAmount: NaN, budgetAmount: 1 })).toBe(
      false
    );
  });
});
