import { describe, expect, it } from "vitest";
import { formatDateInput } from "./formatDateInput";

describe("formatDateInput", () => {
  it.each([
    ["", ""],
    ["1", "1"],
    ["12", "12"],
    ["123", "12/3"],
    ["1203", "12/03"],
    ["12032", "12/03/2"],
    ["12032025", "12/03/2025"],
    ["120320251", "12/03/2025"],
    ["12/03/2025", "12/03/2025"],
    ["ab12-03x2025", "12/03/2025"],
  ])("formats %j as %j", (input, expected) => {
    expect(formatDateInput(input)).toBe(expected);
  });
});
