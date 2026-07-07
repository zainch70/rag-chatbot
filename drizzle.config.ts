import { defineConfig } from "drizzle-kit";
import "dotenv/config";

// Schema changes must go through migrations (npm run db:generate → db:migrate).
// Do not use `drizzle-kit push` — it is blocked via scripts/drizzle-kit.cjs.

export default defineConfig({
  dialect: "postgresql",
  schema: "./db",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});