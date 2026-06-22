import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Example: postgresql://user:pass@host:5432/dbname\nSet the DATABASE_URL environment variable before starting the server.",
  );
}

const databaseUrl = process.env.DATABASE_URL.trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL must not be empty or whitespace.");
}

export const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

// Idle clients can emit errors when PostgreSQL closes or restarts; without this
// handler Node treats them as uncaught exceptions and kills the API process.
let lastPoolErrorAt = 0;
pool.on("error", (err) => {
  const now = Date.now();
  if (now - lastPoolErrorAt < 60_000) return;
  lastPoolErrorAt = now;
  console.warn(
    `[db] PostgreSQL dropped an idle connection (${err.message}). ` +
      "The pool will reconnect automatically. If login keeps failing, restart the " +
      "postgresql-x64-18 Windows service — your local database has been restarting repeatedly.",
  );
});

export const db = drizzle(pool, { schema });

export * from "./schema";
