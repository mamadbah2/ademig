import { defineConfig } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch {}

// Port 3100 : le port 3000 peut servir un autre projet sur cette machine.
export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/preparation.ts",
  // Les tests partagent la même base : on les enchaîne.
  workers: 1,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  webServer: { command: "npx next dev -p 3100", url: "http://localhost:3100", reuseExistingServer: true, timeout: 120_000 },
});
