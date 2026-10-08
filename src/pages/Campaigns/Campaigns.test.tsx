import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Campaigns from "./Campaigns";
import { listMyCampaigns } from "../../services/campaigns";
import { renderSignedIn } from "../../test/renderSignedIn";
import { makeCampaign } from "../../test/fixtures";

vi.mock("../../services/campaigns", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/campaigns")>()),
  listMyCampaigns: vi.fn(),
}));
vi.mock("../../../firebaseSetup", () => ({ db: {} }));

describe("Campaigns", () => {
  beforeEach(() => vi.clearAllMocks());

  it("separates campaigns the user runs from ones they play in", async () => {
    vi.mocked(listMyCampaigns).mockResolvedValue({
      running: [makeCampaign({ status: "On Hold" })],
      playing: [makeCampaign({ id: "camp-2", campaignName: "Tomb" })],
    });
    renderSignedIn(<Campaigns />);

    expect(
      await screen.findByRole("heading", { name: "My Campaigns (1)" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Campaigns I'm Playing In (1)" })
    ).toBeInTheDocument();
    expect(screen.getByText("⭐ Dungeon Master")).toBeInTheDocument();
    expect(screen.getByText("On Hold")).toHaveClass(
      "campaign-card__status--on-hold"
    );
    expect(screen.getByRole("link", { name: /Tomb/ })).toHaveAttribute(
      "href",
      "/campaigns/camp-2"
    );
  });

  it("shows an empty state", async () => {
    vi.mocked(listMyCampaigns).mockResolvedValue({ running: [], playing: [] });
    renderSignedIn(<Campaigns />);

    expect(await screen.findByText(/No campaigns yet/)).toBeInTheDocument();
  });

  it("shows load errors", async () => {
    vi.mocked(listMyCampaigns).mockRejectedValue(new Error("Offline"));
    renderSignedIn(<Campaigns />);

    expect(await screen.findByText("Offline")).toBeInTheDocument();
  });
});
