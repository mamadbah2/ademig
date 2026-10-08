import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import type { Db } from "./types";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL est absente : lancez `vercel env pull .env.local`.");

// Driver WebSocket : contrairement à `neon-http`, il gère les transactions.
export const db: Db = drizzle({ connection: url, schema });
