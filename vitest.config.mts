import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["dotenv/config", "./tests/setup.ts"],
    // Integration tests share one real Postgres instance and truncate shared
    // tables between tests; running files in parallel races those truncations.
    fileParallelism: false,
  },
});
