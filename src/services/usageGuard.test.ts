import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LIMIT,
  UsageLimitError,
  WINDOW_MS,
  isTripped,
  onTrip,
  recordCall,
  resetUsageGuard,
} from "./usageGuard";

describe("usage guard", () => {
  afterEach(() => {
    resetUsageGuard();
    vi.restoreAllMocks();
  });

  const callTimes = (count: number, at: (i: number) => number) => {
    for (let i = 0; i < count; i++) recordCall(at(i));
  };

  it("allows normal use", () => {
    callTimes(LIMIT, () => 1000);
    expect(isTripped()).toBe(false);
  });

  it("trips when too many calls happen within the window", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const listener = vi.fn();
    onTrip(listener);
    callTimes(LIMIT, () => 1000);

    expect(() => recordCall(1001)).toThrow(UsageLimitError);
    expect(isTripped()).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("only counts calls within the sliding window", () => {
    // Twice the limit, but spread over more than two windows
    callTimes(LIMIT * 2, (i) => i * ((WINDOW_MS * 2.5) / LIMIT));
    expect(isTripped()).toBe(false);
  });

  it("keeps failing once tripped, until reset", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => callTimes(LIMIT + 1, () => 0)).toThrow(UsageLimitError);
    expect(() => recordCall(WINDOW_MS * 10)).toThrow(UsageLimitError);

    resetUsageGuard();
    expect(() => recordCall(0)).not.toThrow();
  });
});
