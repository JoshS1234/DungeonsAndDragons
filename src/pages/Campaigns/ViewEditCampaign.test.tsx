import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ViewEditCampaign from "./ViewEditCampaign";
import {
  deleteCampaign,
  getCampaign,
  removePlayer,
  updateCampaign,
} from "../../services/campaigns";
import { leaveCampaign } from "../../services/characters";
import { renderSignedIn } from "../../test/renderSignedIn";
import {
  makeCampaign,
  makePlayer,
  permissionDenied,
} from "../../test/fixtures";

vi.mock("../../services/campaigns", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/campaigns")>()),
  getCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  removePlayer: vi.fn(),
  deleteCampaign: vi.fn(),
}));
vi.mock("../../services/characters", () => ({ leaveCampaign: vi.fn() }));
vi.mock("../../services/sessions", () => ({
  listSessions: vi.fn(() => Promise.resolve([])),
}));
vi.mock("../../../firebaseSetup", () => ({ db: {} }));

const renderPage = () =>
  renderSignedIn(<ViewEditCampaign />, {
    path: "/campaigns/:id",
    url: "/campaigns/camp-1",
  });

describe("ViewEditCampaign", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("as the DM", () => {
    beforeEach(() => {
      vi.mocked(getCampaign).mockResolvedValue({
        campaign: makeCampaign(),
        isDm: true,
        players: [makePlayer()],
        notes: "Strahd is the vampire",
      });
    });

    it("shows the campaign, players and DM notes", async () => {
      renderPage();

      expect(
        await screen.findByRole("heading", {
          name: "Edit Campaign: Curse of Strahd",
        })
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/DM Notes/)).toHaveValue(
        "Strahd is the vampire"
      );
      expect(screen.getByText("Character: Vex")).toBeInTheDocument();
      expect(screen.getByText("camp-1")).toBeInTheDocument();
    });

    it("saves changes", async () => {
      const user = userEvent.setup();
      renderPage();
      const name = await screen.findByLabelText("Campaign Name *");

      await user.clear(name);
      await user.type(name, "Curse of Strahd II");
      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      expect(updateCampaign).toHaveBeenCalledWith(
        "camp-1",
        "user-1",
        expect.objectContaining({ campaignName: "Curse of Strahd II" }),
        "Strahd is the vampire"
      );
    });

    it("removes a player", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(
        await screen.findByRole("button", {
          name: "Remove Vex from campaign",
        })
      );

      expect(removePlayer).toHaveBeenCalledWith("camp-1", "user-2");
      expect(screen.queryByText("Character: Vex")).not.toBeInTheDocument();
    });

    it("deletes the campaign after the name is confirmed", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(
        await screen.findByRole("button", { name: "Delete Campaign" })
      );
      const dialog = screen.getByRole("dialog");
      await user.type(
        within(dialog).getByLabelText("Name to confirm deletion"),
        "Curse of Strahd"
      );
      await user.click(
        within(dialog).getByRole("button", { name: "Delete Campaign" })
      );

      expect(deleteCampaign).toHaveBeenCalledWith("camp-1");
    });
  });

  describe("as a player", () => {
    beforeEach(() => {
      vi.mocked(getCampaign).mockResolvedValue({
        campaign: makeCampaign({ userId: "dm-uid" }),
        isDm: false,
        players: [makePlayer({ userId: "user-1", characterId: "char-1" })],
        notes: "",
      });
    });

    it("is read-only without DM notes", async () => {
      renderPage();

      expect(
        await screen.findByRole("heading", {
          name: "View Campaign: Curse of Strahd",
        })
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Campaign Name *")).toBeDisabled();
      expect(screen.queryByLabelText(/DM Notes/)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Delete Campaign" })
      ).not.toBeInTheDocument();
    });

    it("lets the player leave", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(
        await screen.findByRole("button", {
          name: "Remove yourself from this campaign",
        })
      );

      expect(leaveCampaign).toHaveBeenCalledWith("char-1", "user-1", "camp-1");
      expect(
        await screen.findByText("Navigated to another page")
      ).toBeInTheDocument();
    });
  });

  it("shows only an error when access is denied", async () => {
    vi.mocked(getCampaign).mockRejectedValue(permissionDenied());
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You don't have permission to view this campaign"
    );
    expect(screen.queryByLabelText("Campaign Name *")).not.toBeInTheDocument();
  });
});
