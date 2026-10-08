import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CampaignLinker from "./CampaignLinker";

describe("CampaignLinker", () => {
  it("shows an empty state with no linked campaigns", () => {
    render(
      <CampaignLinker
        linkedCampaigns={[]}
        onLink={vi.fn()}
        onUnlink={vi.fn()}
      />
    );
    expect(screen.getByText(/No campaigns linked yet/)).toBeInTheDocument();
  });

  it("links the trimmed ID and clears the input on success", async () => {
    const user = userEvent.setup();
    const onLink = vi.fn().mockResolvedValue(true);
    render(
      <CampaignLinker linkedCampaigns={[]} onLink={onLink} onUnlink={vi.fn()} />
    );
    const input = screen.getByLabelText("Link to Campaign");

    await user.type(input, "  abc123  {Enter}");

    expect(onLink).toHaveBeenCalledWith("abc123");
    expect(input).toHaveValue("");
  });

  it("keeps the input when linking fails", async () => {
    const user = userEvent.setup();
    const onLink = vi.fn().mockResolvedValue(false);
    render(
      <CampaignLinker linkedCampaigns={[]} onLink={onLink} onUnlink={vi.fn()} />
    );
    const input = screen.getByLabelText("Link to Campaign");

    await user.type(input, "bad-id");
    await user.click(screen.getByRole("button", { name: "Link Campaign" }));

    expect(input).toHaveValue("bad-id");
  });

  it("unlinks a campaign", async () => {
    const user = userEvent.setup();
    const onUnlink = vi.fn();
    render(
      <CampaignLinker
        linkedCampaigns={[{ id: "c1", name: "Curse of Strahd" }]}
        onLink={vi.fn()}
        onUnlink={onUnlink}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Unlink Curse of Strahd" })
    );

    expect(onUnlink).toHaveBeenCalledWith("c1");
  });
});
