import { defineConfig, devices } from "@playwright/test";

// E2E config. Tests live in ./e2e and run against a dev server that Playwright
// starts automatically. The real-login test is gated behind E2E_TEST_EMAIL /
// E2E_TEST_PASSWORD env vars and skips when they're absent, so the suite is
// safe to run anywhere without secrets.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
