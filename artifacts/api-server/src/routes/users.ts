import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import {
  db,
  usersTable,
  enrollmentsTable,
  lessonProgressTable,
  quizAttemptsTable,
  achievementsTable,
  xpEventsTable,
} from "@workspace/db";
import { publicUser, requireAdmin, requireAuth } from "../lib/auth";
import { levelForXp } from "../lib/level";

const router: IRouter = Router();

router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const role = typeof req.query.role === "string" ? req.query.role : undefined;
  const where = role ? eq(usersTable.role, role) : undefined;
  const rows = await (where
    ? db.select().from(usersTable).where(where)
    : db.select().from(usersTable));

  // Aggregate counts in a few cheap queries.
  const enrCounts = await db
    .select({ userId: enrollmentsTable.userId, c: sql<number>`count(*)::int` })
    .from(enrollmentsTable)
    .groupBy(enrollmentsTable.userId);
  const lessonCounts = await db
    .select({ userId: lessonProgressTable.userId, c: sql<number>`count(*)::int` })
    .from(lessonProgressTable)
    .groupBy(lessonProgressTable.userId);
  const quizAvgs = await db
    .select({
      userId: quizAttemptsTable.userId,
      avg: sql<number>`round(avg(${quizAttemptsTable.score}))::int`,
    })
    .from(quizAttemptsTable)
    .groupBy(quizAttemptsTable.userId);
  const badgeCounts = await db
    .select({ userId: achievementsTable.userId, c: sql<number>`count(*)::int` })
    .from(achievementsTable)
    .groupBy(achievementsTable.userId);

  const enrMap = new Map(enrCounts.map((r) => [r.userId, r.c]));
  const lessonMap = new Map(lessonCounts.map((r) => [r.userId, r.c]));
  const quizMap = new Map(quizAvgs.map((r) => [r.userId, r.avg]));
  const badgeMap = new Map(badgeCounts.map((r) => [r.userId, r.c]));

  const items = rows
    .map((u) => ({
      ...publicUser(u),
      enrollmentCount: enrMap.get(u.id) ?? 0,
      lessonCount: lessonMap.get(u.id) ?? 0,
      quizAvg: quizMap.get(u.id) ?? null,
      badgeCount: badgeMap.get(u.id) ?? 0,
    }))
    .sort((a, b) => b.xp - a.xp);
  res.json({ items });
});

router.patch("/users/me", requireAuth, async (req, res): Promise<void> => {
  const u = req.user!;
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  const fields = ["firstName", "lastName", "phone", "bio", "grade", "department", "avatarUrl"] as const;
  for (const f of fields) {
    if (req.body && f in req.body) (updates as any)[f] = req.body[f];
  }
  if (Object.keys(updates).length === 0) {
    res.json(publicUser(u));
    return;
  }
  const [next] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, u.id))
    .returning();
  res.json(publicUser(next));
});

router.patch("/users/me/progress", requireAuth, async (req, res): Promise<void> => {
  const u = req.user!;
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (typeof req.body?.xp === "number") updates.xp = req.body.xp;
  if (typeof req.body?.level === "number") updates.level = req.body.level;
  if (typeof req.body?.streak === "number") updates.streak = req.body.streak;
  if (Object.keys(updates).length === 0) {
    res.json({ ok: true });
    return;
  }
  await db.update(usersTable).set(updates).where(eq(usersTable.id, u.id));
  res.json({ ok: true });
});

router.delete("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  if (id === req.user!.id) {
    res.status(400).json({ error: "You can't delete yourself." });
    return;
  }
  const [removed] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
  if (!removed) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  res.json({ ok: true });
});

router.post("/users/:id/xp", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const amount = Number(req.body?.amount ?? 0);
  const reason = String(req.body?.reason ?? "Manual award");
  if (!Number.isFinite(id) || !Number.isFinite(amount)) {
    res.status(400).json({ error: "Invalid input." });
    return;
  }
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!u) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  const nextXp = u.xp + amount;
  const lvl = levelForXp(nextXp);
  const [updated] = await db
    .update(usersTable)
    .set({ xp: nextXp, level: lvl.level })
    .where(eq(usersTable.id, id))
    .returning();
  await db.insert(xpEventsTable).values({ userId: id, amount, reason });
  res.json({ user: publicUser(updated) });
});

router.post("/users/:id/badges", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const badgeId = Number(req.body?.badgeId);
  if (!Number.isFinite(id) || !Number.isFinite(badgeId)) {
    res.status(400).json({ error: "Invalid input." });
    return;
  }
  const existing = await db
    .select({ id: achievementsTable.id })
    .from(achievementsTable)
    .where(and(eq(achievementsTable.userId, id), eq(achievementsTable.badgeId, badgeId)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(achievementsTable).values({ userId: id, badgeId });
  }
  res.json({ ok: true });
});

export default router;
