import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { db, sessionsTable, usersTable, type DbUser } from "@workspace/db";

export const SESSION_COOKIE = "alshamail_sid";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: DbUser;
    }
  }
}

export function newSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: number): Promise<string> {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionsTable).values({ token, userId, expiresAt });
  return token;
}

export async function destroySession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}

export async function findSessionUser(token: string): Promise<DbUser | null> {
  const rows = await db
    .select({ user: usersTable })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.user ?? null;
}

export function setSessionCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

/**
 * Resolves req.user from the session cookie. Never errors — auth-required
 * routes should check `req.user` themselves.
 */
export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = (req.cookies && req.cookies[SESSION_COOKIE]) as string | undefined;
  if (token) {
    try {
      const user = await findSessionUser(token);
      if (user) req.user = user;
    } catch (err) {
      req.log.error({ err }, "session lookup failed");
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  if (req.user.role !== "admin" && !req.user.isAdmin) {
    res.status(403).json({ error: "Admin only." });
    return;
  }
  next();
}

/** Strip secrets before returning a user to the client. */
export function publicUser(u: DbUser) {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
    isAdmin: u.isAdmin,
    avatarUrl: u.avatarUrl,
    phone: u.phone,
    grade: u.grade,
    department: u.department,
    bio: u.bio,
    xp: u.xp,
    level: u.level,
    streak: u.streak,
  };
}
