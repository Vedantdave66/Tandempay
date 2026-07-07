import { test, expect } from "@playwright/test";

// Seeded by the CI workflow (or manually for local runs) via POST /api/auth/register
// against the disposable test backend/database — never a real account.
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || "e2e-smoke@ci.tandempay.ca";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "E2eSmokePassword123!";

test("landing page loads, user logs in, dashboard renders", async ({ page }) => {
  await page.goto("/");
  const navLoginLink = page.getByRole("navigation").getByRole("link", { name: "Log in" });
  await expect(navLoginLink).toBeVisible();

  await navLoginLink.click();
  await expect(page).toHaveURL(/\/login$/);

  await page.locator("#email").fill(TEST_EMAIL);
  await page.locator("#password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Your Shared Groups")).toBeVisible();
});
