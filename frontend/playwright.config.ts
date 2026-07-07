import { defineConfig, devices } from "@playwright/test";

// E2E smoke test config.
// The app under test always points at http://localhost:8000/api in dev mode
// (see src/services/api.ts — BASE_URL is hardcoded per import.meta.env.PROD),
// so a real backend must be running on :8000 pointing at a disposable database.
// CI starts that backend itself (see .github/workflows/e2e-ci.yml); locally,
// run `uvicorn app.main:app --port 8000` in backend/ before `npx playwright test`.

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
