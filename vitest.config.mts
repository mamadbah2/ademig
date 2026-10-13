import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["src/**/*.test.ts"],
    // Chaque test démarre un Postgres PGlite en mémoire : quelques secondes au plus.
    testTimeout: 30_000,
    // Chaque fichier de test lance son PGlite : trop de workers en parallèle saturent la mémoire (exit 137).
    maxWorkers: 2,
  },
});
