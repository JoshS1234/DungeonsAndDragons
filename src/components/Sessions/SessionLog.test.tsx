import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SessionLog from "./SessionLog";
import {
  deleteSession,
  listSessions,
  saveSession,
} from "../../services/sessions";

vi.mock("../../services/sessions", () => ({
  listSessions: vi.fn(),
  saveSession: vi.fn(),
  deleteSession: vi.fn(),
}));

const barovia = {
  id: "s1",
  date: "2026-10-01",
  title: "Into the mists",
  recap: "The party reached Barovia.",
  dmNotes: "Strahd is watching",
};

describe("SessionLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listSessions).mockResolvedValue([barovia]);
  });

  it("shows players recaps without editing controls", async () => {
    render(<SessionLog campaignId="camp-1" isDm={false} />);

    expect(await screen.findByText("Into the mists")).toBeInTheDocument();
    expect(screen.getByText("The party reached Barovia.")).toBeInTheDocument();
    expect(listSessions).toHaveBeenCalledWith("camp-1", false);
    expect(
      screen.queryByRole("button", { name: "New session" })
    ).not.toBeInTheDocument();
  });

  it("lets the DM log a new session, newest first", async () => {
    const user = userEvent.setup();
    vi.mocked(saveSession).mockResolvedValue("s2");
    render(<SessionLog campaignId="camp-1" isDm />);
    expect(await screen.findByText("DM notes:")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "New session" }));
    await user.clear(screen.getByLabelText("Date"));
    await user.type(screen.getByLabelText("Date"), "2026-10-08");
    await user.type(screen.getByLabelText("Title"), "The Death House");
    await user.type(
      screen.getByLabelText("Recap (everyone sees this)"),
      "Rose and Thorn"
    );
    await user.click(screen.getByRole("button", { name: "Save session" }));

    expect(saveSession).toHaveBeenCalledWith("camp-1", {
      date: "2026-10-08",
      title: "The Death House",
      recap: "Rose and Thorn",
      dmNotes: "",
    });
    const titles = within(screen.getByRole("list", { name: "Sessions" }))
      .getAllByRole("heading")
      .map((h) => h.textContent);
    expect(titles[0]).toContain("The Death House");
    expect(titles[1]).toContain("Into the mists");
  });

  it("edits and deletes sessions", async () => {
    const user = userEvent.setup();
    vi.mocked(saveSession).mockResolvedValue("s1");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<SessionLog campaignId="camp-1" isDm />);

    await user.click(
      await screen.findByRole("button", { name: "Edit Into the mists" })
    );
    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Into the Mists");
    await user.click(screen.getByRole("button", { name: "Save session" }));
    expect(saveSession).toHaveBeenCalledWith(
      "camp-1",
      expect.objectContaining({ id: "s1", title: "Into the Mists" })
    );

    await user.click(
      screen.getByRole("button", { name: "Delete Into the Mists" })
    );
    expect(deleteSession).toHaveBeenCalledWith("camp-1", "s1");
    expect(screen.getByText("No sessions logged yet.")).toBeInTheDocument();
  });

  it("needs a title before saving", async () => {
    const user = userEvent.setup();
    render(<SessionLog campaignId="camp-1" isDm />);
    await user.click(
      await screen.findByRole("button", { name: "New session" })
    );

    expect(screen.getByRole("button", { name: "Save session" })).toBeDisabled();
  });

  it("shows errors", async () => {
    vi.mocked(listSessions).mockRejectedValue(new Error("Offline"));
    render(<SessionLog campaignId="camp-1" isDm />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
  });
});
