import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"] ?? "3001";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Global handlers for clearer diagnostics
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  // give the logger time to flush
  setTimeout(() => process.exit(1), 100);
});
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
});

async function waitForDatabase(maxAttempts = 15, delayMs = 1000): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await pool.query("SELECT 1");
      return true;
    } catch (err) {
      if (attempt === maxAttempts) {
        logger.error({ err }, "Database not reachable — start PostgreSQL, then restart the API");
        return false;
      }
      logger.warn({ attempt, maxAttempts }, "Waiting for PostgreSQL on DATABASE_URL...");
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

(async () => {
  // Seed if DB is available; import dynamically to avoid failing at module import time
  if (process.env.DATABASE_URL) {
    const dbReady = await waitForDatabase();
    if (dbReady) {
      try {
        const mod = await import("./lib/seed");
        if (typeof mod.seedIfEmpty === "function") {
          await mod.seedIfEmpty();
        }
      } catch (err) {
        logger.error({ err }, "Seed failed");
      }
    }
  } else {
    logger.warn("DATABASE_URL not set — skipping DB seed (server will start without DB)");
  }

  const server = app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });

  // Graceful shutdown: close HTTP server and DB pool
  const shutdown = async (signal: string) => {
    try {
      logger.info({ signal }, "Shutdown requested");
      server.close(() => logger.info("HTTP server closed"));
      try {
        await pool.end();
        logger.info("DB pool closed");
      } catch (dbErr) {
        logger.error({ err: dbErr }, "Error closing DB pool");
      }
      // allow logger to flush
      setTimeout(() => process.exit(0), 200);
    } catch (err) {
      logger.fatal({ err }, "Graceful shutdown failed");
      setTimeout(() => process.exit(1), 200);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();
