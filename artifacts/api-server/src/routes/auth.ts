import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  createSession,
  destroySession,
  publicUser,
  setSessionCookie,
} from "../lib/auth";
import { sanitizeBody } from "../lib/logger";
import { DB_UNAVAILABLE_MESSAGE, isDbUnavailable } from "../lib/db-errors";

const router: IRouter = Router();

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.user) {
    res.json({ user: null });
    return;
  }
  res.json({ user: publicUser(req.user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  try {
    // Basic guard: ensure body looks like JSON object with expected fields.
    if (!req.body || typeof req.body !== "object") {
      req.log?.warn({ body: req.body, headers: req.headers }, "login: invalid request body");
      res.status(400).json({ error: "Invalid JSON body." });
      return;
    }

    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    await db
      .update(usersTable)
      .set({ lastActiveAt: new Date() })
      .where(eq(usersTable.id, user.id));
    const token = await createSession(user.id);
    setSessionCookie(res, token);
    res.json({ user: publicUser(user) });
  } catch (err) {
    const safeBody = sanitizeBody(req.body);
    try {
      // Log only a shallow set of headers to avoid leaking cookies or auth tokens.
      const safeHeaders: Record<string, any> = {
        host: req.headers.host,
        referer: req.headers.referer,
        "user-agent": req.headers["user-agent"],
        "content-type": req.headers["content-type"],
      };
      req.log?.error({ err, body: safeBody, headers: safeHeaders }, "login failed");
    } catch (logErr) {
      // eslint-disable-next-line no-console
      console.error("login failed", logErr, err, { body: safeBody });
    }
    if (isDbUnavailable(err)) {
      res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE, requestId: req.id });
      return;
    }
    res.status(500).json({ error: "Internal server error", requestId: req.id });
  }
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const token = (req.cookies && req.cookies[SESSION_COOKIE]) as string | undefined;
  if (token) {
    try {
      await destroySession(token);
    } catch {
      /* ignore */
    }
  }
  clearSessionCookie(res);
  res.json({ ok: true });
});

export default router;
