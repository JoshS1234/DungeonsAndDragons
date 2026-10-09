import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import UsageLimitBanner from "./UsageLimitBanner";
import { LIMIT, recordCall, resetUsageGuard } from "../../services/usageGuard";

describe("UsageLimitBanner", () => {
  afterEach(() => resetUsageGuard());

  it("appears when the usage guard trips", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<UsageLimitBanner />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    act(() => {
      try {
        for (let i = 0; i <= LIMIT; i++) recordCall(0);
      } catch {
        // expected
      }
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "paused to avoid unexpected charges"
    );
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });
});
