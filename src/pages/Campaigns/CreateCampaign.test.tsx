import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateCampaign from "./CreateCampaign";
import { createCampaign } from "../../services/campaigns";
import { renderSignedIn } from "../../test/renderSignedIn";

vi.mock("../../services/campaigns", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/campaigns")>()),
  createCampaign: vi.fn(),
}));
vi.mock("../../../firebaseSetup", () => ({ db: {} }));

describe("CreateCampaign", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates the campaign with notes kept separate", async () => {
    const user = userEvent.setup();
    vi.mocked(createCampaign).mockResolvedValue("camp-9");
    renderSignedIn(<CreateCampaign />);

    await user.type(screen.getByLabelText("Campaign Name *"), "Strahd");
    await user.type(screen.getByLabelText(/DM Notes/), "Vampire!");
    await user.click(screen.getByRole("button", { name: "Create Campaign" }));

    expect(createCampaign).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ campaignName: "Strahd", currentLevel: 1 }),
      "Vampire!"
    );
    expect(vi.mocked(createCampaign).mock.lastCall![1]).not.toHaveProperty(
      "notes"
    );
    expect(
      await screen.findByText("Navigated to another page")
    ).toBeInTheDocument();
  });

  it("shows errors", async () => {
    const user = userEvent.setup();
    vi.mocked(createCampaign).mockRejectedValue(new Error("Offline"));
    renderSignedIn(<CreateCampaign />);

    await user.type(screen.getByLabelText("Campaign Name *"), "Strahd");
    await user.click(screen.getByRole("button", { name: "Create Campaign" }));

    expect(await screen.findByText("Offline")).toBeInTheDocument();
  });
});
