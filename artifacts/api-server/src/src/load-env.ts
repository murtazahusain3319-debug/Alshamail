import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(envPath: string, override = false): void {
  if (!fs.existsSync(envPath)) return;

  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!key) continue;
    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

if (process.env.NODE_ENV !== "production") {
  try {
    // Local workspace .env always wins in development (overrides system Neon URL).
    loadEnvFile(path.resolve(__dirname, "../../../.env"), true);
    // Optional per-artifact override when a value is not already set.
    loadEnvFile(path.resolve(__dirname, "../../.env"));
  } catch (err) {
    console.warn("Could not load .env file", err);
  }
}

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.trim();
}
