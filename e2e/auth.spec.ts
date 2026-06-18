import { test, expect } from "@playwright/test";

// These tests exercise the real rendered auth UI. The first three need no
// credentials. The real-login test only runs when E2E_TEST_EMAIL and
// E2E_TEST_PASSWORD are set (use a dedicated, confirmed test account — never a
// real user's). Without them it skips, so the suite stays green anywhere.

test.describe("Auth page", () => {
  test("landing page renders the sign-in form", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText(/Sign In/i);
  });

  test("switching to sign-up reveals the confirm-password field", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Sign Up", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Start foraging." })).toBeVisible();
    await expect(page.getByText("Confirm Password", { exact: true })).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText(/Create Account/i);
  });

  test("sign-up flags mismatched passwords without submitting", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Sign Up", exact: true }).click();

    const inputs = page.locator('input[type="password"]');
    await inputs.nth(0).fill("abcdef1");
    await inputs.nth(1).fill("abcdef2");

    await expect(page.getByText("Passwords do not match")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });
});

test.describe("Real login", () => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  test.skip(!email || !password, "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run the real login test");

  test("signs in and lands on dashboard or onboarding", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("you@example.com").fill(email!);
    await page.locator('input[type="password"]').first().fill(password!);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 15_000 });
  });
});
