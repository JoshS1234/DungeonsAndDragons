import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  createCampaign,
  createCharacter,
  resetEmulators,
  signUp,
} from "./helpers";

// Catches effects stuck in a loop: once a page has loaded, it shouldn't
// keep calling Firebase. Live listeners don't count as calls while idle.

test.beforeEach(resetEmulators);

const callCount = (page: Page) =>
  page.evaluate(
    () =>
      (globalThis as unknown as { __firebaseCallCount: number })
        .__firebaseCallCount
  );

const expectQuietAfterLoading = async (page: Page, path: string) => {
  await page.goto(path);
  await expect(page.locator("h2").first()).toBeVisible();
  await expect(page.getByText(/Loading/)).toHaveCount(0);
  await page.waitForTimeout(1000);

  const before = await callCount(page);
  await page.waitForTimeout(5000);
  expect(await callCount(page), `calls while idle on ${path}`).toBe(before);
};

test("pages stop calling Firebase once loaded", async ({ browser }) => {
  test.setTimeout(150_000);
  const dm = await (await browser.newContext()).newPage();
  await signUp(dm, "dm@example.com");
  const campaignId = await createCampaign(dm, "Curse of Strahd", "Notes");

  const player = await (await browser.newContext()).newPage();
  await signUp(player, "player@example.com");
  await createCharacter(player, "Thalia", { campaignId });
  await player.getByRole("heading", { name: "Thalia" }).click();
  const characterId = player.url().split("/").pop()!;

  // An encounter in progress, so the tracker's listeners are live too
  await dm.goto(`/#/campaigns/${campaignId}/party`);
  await dm.getByRole("button", { name: "Start encounter" }).click();
  await dm.getByRole("button", { name: "Add party (roll initiative)" }).click();

  for (const path of [
    "/",
    "/#/characters",
    `/#/characters/${characterId}`,
    `/#/characters/${characterId}/play`,
    `/#/campaigns/${campaignId}`,
    "/#/dice",
    "/#/account",
  ]) {
    await expectQuietAfterLoading(player, path);
  }
  for (const path of [
    "/#/campaigns",
    `/#/campaigns/${campaignId}`,
    `/#/campaigns/${campaignId}/party`,
  ]) {
    await expectQuietAfterLoading(dm, path);
  }
});
