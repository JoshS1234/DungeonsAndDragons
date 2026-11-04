import { expect, test } from "@playwright/test";
import type { Browser } from "@playwright/test";
import {
  createCampaign,
  createCharacter,
  resetEmulators,
  signUp,
} from "./helpers";

test.beforeEach(resetEmulators);

const newUser = async (browser: Browser, email: string) => {
  const page = await (await browser.newContext()).newPage();
  await signUp(page, email);
  return page;
};

test("the DM runs initiative and players watch live", async ({ browser }) => {
  const dm = await newUser(browser, "dm@example.com");
  const campaignId = await createCampaign(dm, "Curse of Strahd");
  const player = await newUser(browser, "player@example.com");
  await createCharacter(player, "Thalia", { campaignId });

  await dm.goto(`/#/campaigns/${campaignId}/party`);
  await expect(dm.getByLabel("Thalia hit points")).toHaveText("8 / 8 HP");

  // Player damage shows up on the DM's party view without a reload
  await player.getByRole("link", { name: "▶ Play" }).click();
  await player.getByLabel("Amount").fill("3");
  await player.getByRole("button", { name: "Damage" }).click();
  await expect(dm.getByLabel("Thalia hit points")).toHaveText("5 / 8 HP");

  await dm.getByRole("button", { name: "Start encounter" }).click();
  await dm.getByRole("button", { name: "Add party (roll initiative)" }).click();
  await dm.getByRole("button", { name: "Add monsters" }).click();
  await dm.getByLabel("Search monsters").fill("goblin");
  await dm.getByLabel("How many").fill("2");
  await dm.getByRole("button", { name: "Add Goblin" }).click();

  await player.goto(`/#/campaigns/${campaignId}/party`);
  const order = player.getByRole("list", { name: "Initiative order" });
  await expect(order.getByRole("listitem")).toHaveCount(3);
  await expect(order).toContainText("Goblin 2");

  await dm.getByLabel("Amount for Goblin 1").fill("5");
  await dm.getByRole("button", { name: "Damage Goblin 1" }).click();
  await expect(
    order.getByRole("listitem").filter({ hasText: "Goblin 1" })
  ).toContainText("Bloodied");

  await dm.getByRole("button", { name: "Next turn →" }).click();
  await dm.getByRole("button", { name: "Next turn →" }).click();
  await dm.getByRole("button", { name: "Next turn →" }).click();
  await expect(player.getByText("Round 2")).toBeVisible();

  await dm.getByRole("button", { name: "End encounter" }).click();
  await expect(player.getByText("No encounter running.")).toBeVisible();
});
