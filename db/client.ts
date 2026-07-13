import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export const sqlClient = postgres(process.env.DATABASE_URL!, {
  prepare: false,
});

export const db = drizzle(sqlClient, { schema });
