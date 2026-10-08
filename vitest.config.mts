import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["src/**/*.test.ts"],
    // Chaque test démarre un Postgres PGlite en mémoire : quelques secondes au plus.
    testTimeout: 30_000,
  },
});
