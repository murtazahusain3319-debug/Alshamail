/** True when Postgres is down, restarting, or still recovering. */
export function isDbUnavailable(err: unknown): boolean {
  const parts: string[] = [];
  let current: unknown = err;
  for (let i = 0; i < 4 && current; i++) {
    if (current instanceof Error) {
      parts.push(current.message);
      current = (current as Error & { cause?: unknown }).cause;
    } else {
      parts.push(String(current));
      break;
    }
  }
  const text = parts.join(" ").toLowerCase();
  return (
    text.includes("econnrefused") ||
    text.includes("econnreset") ||
    text.includes("recovery mode") ||
    text.includes("starting up") ||
    text.includes("not yet accepting connections")
  );
}

export const DB_UNAVAILABLE_MESSAGE =
  "Database is unavailable. Start PostgreSQL (postgresql-x64-18) and try again.";
