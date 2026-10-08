import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

// Accepte la base Neon de l'application comme la base PGlite des tests.
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

// Transaction ouverte par `db.transaction(async (tx) => …)`.
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
