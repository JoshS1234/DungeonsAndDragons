import { expect, test } from "@playwright/test";
import type { Browser } from "@playwright/test";
import {
  createCampaign,
  createCharacter,
  resetEmulators,
  signUp,
} from "./helpers";

test.beforeEach(resetEmulators);

/** A separate browser context, so two users can be signed in at once. */
const newUser = async (browser: Browser, email: string) => {
  const page = await (await browser.newContext()).newPage();
  await signUp(page, email);
  return page;
};

test("a DM and a player share a campaign", async ({ browser }) => {
  const dm = await newUser(browser, "dm@example.com");
  const campaignId = await createCampaign(
    dm,
    "Curse of Strahd",
    "Strahd is the vampire"
  );

  const player = await newUser(browser, "player@example.com");
  await createCharacter(player, "Thalia", { campaignId });

  // The player sees the campaign, but not the DM's notes
  await player.goto("/#/campaigns");
  await player.getByRole("heading", { name: "Curse of Strahd" }).click();
  await expect(
    player.getByText("View-only mode: You are a player in this campaign")
  ).toBeVisible();
  await expect(player.getByText("Strahd is the vampire")).toHaveCount(0);

  // The DM sees the player and can open their character, read-only
  await dm.reload();
  await dm.getByText("Character: Thalia").click();
  await expect(
    dm.getByRole("heading", { name: "View Character: Thalia" })
  ).toBeVisible();
  await expect(dm.getByLabel("Character Name")).toBeDisabled();

  // The DM removes the player, who then loses access
  await dm.getByRole("button", { name: "← Back to Campaign" }).click();
  await dm.getByRole("button", { name: "Remove Thalia from campaign" }).click();
  await expect(dm.getByText("No players linked yet.")).toBeVisible();

  await player.reload();
  await expect(
    player.getByText("You don't have permission to view this campaign")
  ).toBeVisible();
});

test("a stranger can't open a campaign by URL", async ({ browser }) => {
  const dm = await newUser(browser, "dm@example.com");
  const campaignId = await createCampaign(dm, "Secret Campaign");

  const stranger = await newUser(browser, "stranger@example.com");
  await stranger.goto(`/#/campaigns/${campaignId}`);
  await expect(
    stranger.getByText("You don't have permission to view this campaign")
  ).toBeVisible();
});

test("the DM logs sessions; players read recaps but not notes", async ({
  browser,
}) => {
  const dm = await newUser(browser, "dm@example.com");
  const campaignId = await createCampaign(dm, "Curse of Strahd");
  await dm.getByRole("button", { name: "New session" }).click();
  await dm.getByLabel("Title").fill("Into the mists");
  await dm.getByLabel("Recap (everyone sees this)").fill("We reached Barovia.");
  await dm.getByLabel("DM notes (only you see these)").fill("Strahd watches");
  await dm.getByRole("button", { name: "Save session" }).click();
  await expect(dm.getByText("Strahd watches")).toBeVisible();

  const player = await newUser(browser, "player@example.com");
  await createCharacter(player, "Thalia", { campaignId });
  await player.goto(`/#/campaigns/${campaignId}`);
  await expect(player.getByText("We reached Barovia.")).toBeVisible();
  await expect(player.getByText("Strahd watches")).toHaveCount(0);
});
