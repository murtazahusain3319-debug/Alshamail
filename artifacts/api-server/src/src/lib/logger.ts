import pino from "pino";

/**
 * Sanitize request bodies for logging. Removes/redacts common secrets
 * and truncates very long string values to avoid log flooding.
 */
export function sanitizeBody(b: any) {
  try {
    if (!b || typeof b !== "object") return b;
    const out: Record<string, any> = {};
    for (const k of Object.keys(b)) {
      const v = b[k];
      const lk = k.toLowerCase();
      if (lk.includes("password") || lk.includes("token") || lk.includes("secret")) {
        out[k] = "[REDACTED]";
        continue;
      }
      if (typeof v === "string") {
        out[k] = v.length > 2000 ? `${v.slice(0, 2000)}...[truncated]` : v;
        continue;
      }
      out[k] = v;
    }
    return out;
  } catch {
    return "[UNSANITIZABLE]";
  }
}

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
    // redact common sensitive fields from request bodies
    "req.body.password",
    "req.body.passwordHash",
    "req.body.*token*",
  ],
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
