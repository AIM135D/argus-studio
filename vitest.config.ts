import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./app/renderer/src/test/setup.ts"],
    globals: true,
    include: ["app/renderer/src/**/*.test.{ts,tsx}"]
  }
});
