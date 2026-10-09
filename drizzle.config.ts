import { defineConfig } from "drizzle-kit";

// drizzle-kit ne lit que `.env` : on charge `.env.local` nous-mêmes s'il existe.
try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
