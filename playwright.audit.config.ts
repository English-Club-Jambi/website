import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "responsive-headings.spec.ts",
  fullyParallel: true,
  workers: 3,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3987",
    viewport: { width: 390, height: 844 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium-mobile-audit", use: { browserName: "chromium" } },
    { name: "firefox-mobile-audit", use: { browserName: "firefox" } },
    { name: "webkit-mobile-audit", use: { browserName: "webkit" } },
  ],
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3987",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
