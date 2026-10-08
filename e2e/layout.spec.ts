import { expect, test } from "@playwright/test";
import { resetEmulators, signUp } from "./helpers";

test.beforeEach(resetEmulators);

for (const path of ["/", "/#/characters", "/#/campaigns", "/#/rules"]) {
  test(`no horizontal scrolling on ${path}`, async ({ page }) => {
    await signUp(page, "player@example.com");
    await page.goto(path);
    // Wait for the page's content (Firestore keeps a connection open, so
    // "network idle" never happens)
    await expect(page.locator("h2").first()).toBeVisible();
    await expect(page.getByText(/Loading/)).toHaveCount(0);

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow).toBe(0);
  });
}
