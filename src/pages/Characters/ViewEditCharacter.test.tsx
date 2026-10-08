import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ViewEditCharacter from "./ViewEditCharacter";
import { findJoinableCampaign } from "../../services/campaigns";
import {
  deleteCharacter,
  getCharacter,
  getCharacterCampaigns,
  joinCampaign,
  leaveCampaign,
  updateCharacter,
} from "../../services/characters";
import { renderSignedIn } from "../../test/renderSignedIn";
import { permissionDenied, storedCharacter } from "../../test/fixtures";

vi.mock("../../services/campaigns", () => ({ findJoinableCampaign: vi.fn() }));
vi.mock("../../services/characters", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/characters")>()),
  getCharacter: vi.fn(),
  getCharacterCampaigns: vi.fn(),
  updateCharacter: vi.fn(),
  deleteCharacter: vi.fn(),
  joinCampaign: vi.fn(),
  leaveCampaign: vi.fn(),
}));
vi.mock("../../../firebaseSetup", () => ({ db: {} }));

const renderPage = () =>
  renderSignedIn(<ViewEditCharacter />, {
    path: "/characters/:id",
    url: "/characters/char-1",
  });

describe("ViewEditCharacter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCharacterCampaigns).mockResolvedValue([
      { id: "camp-1", name: "Curse of Strahd" },
    ]);
  });

  describe("as the owner", () => {
    beforeEach(() => {
      vi.mocked(getCharacter).mockResolvedValue(
        storedCharacter({ campaignIds: ["camp-1"] })
      );
    });

    it("loads the character for editing", async () => {
      renderPage();

      expect(
        await screen.findByRole("heading", { name: "Edit Character: Thalia" })
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Character Name")).toBeEnabled();
      expect(screen.getByText("Curse of Strahd")).toBeInTheDocument();
    });

    it("saves changes and returns to the list", async () => {
      const user = userEvent.setup();
      renderPage();
      const name = await screen.findByLabelText("Character Name");

      await user.clear(name);
      await user.type(name, "Thalia the Bold");
      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      expect(updateCharacter).toHaveBeenCalledWith(
        "char-1",
        "user-1",
        expect.objectContaining({ characterName: "Thalia the Bold" }),
        "Josh"
      );
      expect(
        await screen.findByText("Navigated to another page")
      ).toBeInTheDocument();
    });

    it("joins a campaign by ID", async () => {
      const user = userEvent.setup();
      vi.mocked(findJoinableCampaign).mockResolvedValue({
        campaignName: "Tomb of Annihilation",
        dungeonMaster: "Sam",
      });
      renderPage();

      await user.type(
        await screen.findByLabelText("Link to Campaign"),
        "camp-2"
      );
      await user.click(screen.getByRole("button", { name: "Link Campaign" }));

      expect(joinCampaign).toHaveBeenCalledWith(
        "char-1",
        "user-1",
        "camp-2",
        expect.objectContaining({ characterName: "Thalia" }),
        "Josh"
      );
      expect(
        await screen.findByText("Tomb of Annihilation")
      ).toBeInTheDocument();
    });

    it("shows why a campaign can't be joined", async () => {
      const user = userEvent.setup();
      vi.mocked(findJoinableCampaign).mockRejectedValue(
        new Error("Campaign not found. Please check the Campaign ID.")
      );
      renderPage();

      await user.type(await screen.findByLabelText("Link to Campaign"), "nope");
      await user.click(screen.getByRole("button", { name: "Link Campaign" }));

      expect(
        await screen.findByText(
          "Campaign not found. Please check the Campaign ID."
        )
      ).toBeInTheDocument();
      expect(joinCampaign).not.toHaveBeenCalled();
    });

    it("stops at five campaigns", async () => {
      const user = userEvent.setup();
      vi.mocked(getCharacter).mockResolvedValue(
        storedCharacter({ campaignIds: ["a", "b", "c", "d", "e"] })
      );
      renderPage();

      await user.type(
        await screen.findByLabelText("Link to Campaign"),
        "camp-6"
      );
      await user.click(screen.getByRole("button", { name: "Link Campaign" }));

      expect(
        await screen.findByText("A character can be in at most 5 campaigns.")
      ).toBeInTheDocument();
      expect(findJoinableCampaign).not.toHaveBeenCalled();
    });

    it("leaves a campaign", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(
        await screen.findByRole("button", { name: "Unlink Curse of Strahd" })
      );

      expect(leaveCampaign).toHaveBeenCalledWith("char-1", "user-1", "camp-1");
      expect(screen.queryByText("Curse of Strahd")).not.toBeInTheDocument();
    });

    it("deletes after the name is confirmed", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(
        await screen.findByRole("button", { name: "Delete Character" })
      );
      const dialog = screen.getByRole("dialog");
      await user.type(
        within(dialog).getByLabelText("Name to confirm deletion"),
        "Thalia"
      );
      await user.click(
        within(dialog).getByRole("button", { name: "Delete Character" })
      );

      expect(deleteCharacter).toHaveBeenCalledWith("char-1", "user-1");
    });
  });

  it("is read-only for campaign-mates", async () => {
    vi.mocked(getCharacter).mockResolvedValue(
      storedCharacter({}, { userId: "someone-else" })
    );
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "View Character: Thalia" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Character Name")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Save Changes" })
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Link to Campaign")).not.toBeInTheDocument();
    expect(getCharacterCampaigns).not.toHaveBeenCalled();
  });

  it("shows only an error for a missing character", async () => {
    vi.mocked(getCharacter).mockResolvedValue(null);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Character not found"
    );
    expect(screen.queryByLabelText("Character Name")).not.toBeInTheDocument();
  });

  it("explains a permission error", async () => {
    vi.mocked(getCharacter).mockRejectedValue(permissionDenied());
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You don't have permission to view this character"
    );
  });
});
