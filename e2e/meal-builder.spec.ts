import { test, expect, Page } from "@playwright/test";

// Exercises the meal builder end to end: build a multi-part meal, save it, then
// reopen it and confirm the per-part breakdown persisted. Runs only when a
// dedicated test account is provided via E2E_TEST_EMAIL / E2E_TEST_PASSWORD.

const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

test.skip(!email || !password, "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run the meal-builder test");

async function login(page: Page) {
  await page.goto("/");
  await page.getByPlaceholder("you@example.com").fill(email!);
  await page.locator('input[type="password"]').first().fill(password!);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 15_000 });
}

test("build a multi-part meal, save it, and reopen the breakdown", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard/calories");

  await page.getByRole("button", { name: /Build/ }).click();

  // Add two parts manually (no AI needed).
  const parts = [
    { amount: "200g", name: "Grilled chicken breast", cals: "330", protein: "62", carbs: "0", fat: "7" },
    { amount: "1 cup", name: "White rice", cals: "205", protein: "4", carbs: "45", fat: "0" },
  ];

  for (const p of parts) {
    await page.getByPlaceholder("150g / 1 cup").fill(p.amount);
    await page.getByPlaceholder("Chicken breast").fill(p.name);
    const nums = page.locator('input[type="number"]');
    await nums.nth(0).fill(p.cals);
    await nums.nth(1).fill(p.protein);
    await nums.nth(2).fill(p.carbs);
    await nums.nth(3).fill(p.fat);
    await page.getByRole("button", { name: "+ Add part to meal" }).click();
  }

  // Live total should reflect the sum (330 + 205 = 535 kcal).
  await expect(page.getByText("535", { exact: true })).toBeVisible();

  const mealName = `E2E Test Meal ${Date.now()}`;
  await page.getByPlaceholder("e.g. Post-Workout Bowl").fill(mealName);
  await page.getByRole("button", { name: /Save Meal/ }).click();

  // Lands back on the log with the new meal present.
  await expect(page.getByText(mealName)).toBeVisible({ timeout: 10_000 });

  // Reopen it and confirm the saved parts are shown.
  await page.getByText(mealName).click();
  await expect(page.getByText(/Meal Parts/)).toBeVisible();
  await expect(page.getByText("Grilled chicken breast")).toBeVisible();
  await expect(page.getByText("White rice")).toBeVisible();

  // Edit it — rename and confirm the change persists in the log.
  await page.getByTitle("Edit").click();
  await expect(page.getByText("Edit Entry")).toBeVisible();
  const renamed = `${mealName} EDITED`;
  await page.getByLabel("entry-name").fill(renamed);
  await page.getByRole("button", { name: "Save Changes" }).click();
  // Modal returns to the detail view showing the new name (the heading is unique).
  await expect(page.getByRole("heading", { name: renamed })).toBeVisible({ timeout: 10_000 });

  // Clean up so repeated runs don't pile up test data (modal is still open on it).
  await page.getByRole("button", { name: "Remove from Log" }).click();
});

test("food search tab + backdated-logging controls render", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard/calories");

  await page.getByRole("button", { name: /Search/ }).click();
  await expect(page.getByPlaceholder(/Search a food/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Scan barcode/ })).toBeVisible();
  // Backdating control shows on any non-log tab
  await expect(page.getByText("Logging for")).toBeVisible();
});
