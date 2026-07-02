import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  workers: 1,
  reporter: [["list"]],
  outputDir: "output/playwright",
  webServer: {
    command: "vite --host 127.0.0.1",
    port: 5173,
    reuseExistingServer: true,
    timeout: 30_000
  }
});
