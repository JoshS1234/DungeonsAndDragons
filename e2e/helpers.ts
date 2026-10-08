import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const PROJECT = "demo-dnd";

/** Wipe all emulator users and data. */
export const resetEmulators = async () => {
  await Promise.all([
    fetch(
      `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
      { method: "DELETE" }
    ),
    fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, {
      method: "DELETE",
    }),
  ]);
};

export const PASSWORD = "correct-horse";

export const signUp = async (page: Page, email: string) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New user" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Adventurer!" })
  ).toBeVisible();
};

export const signIn = async (page: Page, email: string) => {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Adventurer!" })
  ).toBeVisible();
};

export const signOut = async (page: Page) => {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
};

export const createCharacter = async (
  page: Page,
  name: string,
  { campaignId }: { campaignId?: string } = {}
) => {
  await page.goto("/#/characters/create");
  await page.getByLabel("Character Name").fill(name);
  await page.getByLabel("Class", { exact: true }).selectOption("Rogue");
  await page.getByLabel("Race", { exact: true }).selectOption("Half-Elf");
  if (campaignId) {
    await page.getByLabel("Link to Campaign").fill(campaignId);
    await page.getByRole("button", { name: "Link Campaign" }).click();
    await expect(page.locator(".linked-campaigns-list")).toBeVisible();
  }
  await page.getByRole("button", { name: "Create Character" }).click();
  await expect(
    page.getByRole("heading", { name: "👥 Characters" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name })).toBeVisible();
};

/** Creates a campaign and returns its ID. */
export const createCampaign = async (
  page: Page,
  name: string,
  notes = ""
): Promise<string> => {
  await page.goto("/#/campaigns/create");
  await page.getByLabel("Campaign Name *").fill(name);
  if (notes) await page.getByLabel(/DM Notes/).fill(notes);
  await page.getByRole("button", { name: "Create Campaign" }).click();
  const id = page.locator(".campaign-id-display__id");
  await expect(id).toBeVisible();
  return (await id.textContent())!.trim();
};
