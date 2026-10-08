import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

// Accepte la base Neon de l'application comme la base PGlite des tests.
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
