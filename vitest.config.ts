import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    include: ["./src/tests/**/*.test.{ts,tsx}"],
    exclude: ["./src/tests/e2e/**"],
    globals: true,
    reporters: ["verbose"],
    coverage: {
      enabled: false,
    },
  },
});