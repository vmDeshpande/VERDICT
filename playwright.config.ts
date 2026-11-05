import { defineConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { requireTestDatabaseConfiguration } from "./src/lib/testing/test-database-config";

loadEnvConfig(process.cwd());

const { uri: testMongoUri } = requireTestDatabaseConfiguration(process.env.TEST_MONGODB_URI);

export default defineConfig({
  testDir: "./src/tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...{ channel: "chromium" },
      },
    },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    timeout: 120000,
    reuseExistingServer: false,
    env: { MONGODB_URI: testMongoUri },
  },
});