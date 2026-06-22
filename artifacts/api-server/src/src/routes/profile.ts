import { Router, type IRouter } from "express";
import { eq, desc, and, inArray } from "drizzle-orm";
import {
  db,
  usersTable,
  achievementsTable,
  badgesTable,
  classesTable,
  classEnrollmentsTable,
  classTeachersTable,
} from "@workspace/db";
import { publicUser, requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/profile/me", requireAuth, async (req, res): Promise<void> => {
  res.json(publicUser(req.user!));
});

router.get("/leaderboard", requireAuth, async (req, res): Promise<void> => {
  const u = req.user!;
  const isAdmin = !!u.isAdmin;
  const isTeacher = u.role === "teacher";

  if (!isAdmin && !isTeacher) {
    res.status(403).json({ error: "Leaderboard is only available to admins and teachers." });
    return;
  }

  const classId = parseInt(String(req.query.classId ?? ""), 10);
  if (!Number.isFinite(classId)) {
    res.status(400).json({ error: "classId query parameter is required." });
    return;
  }

  const [classData] = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.id, classId));
  if (!classData) {
    res.status(404).json({ error: "Class not found." });
    return;
  }

  if (!isAdmin && isTeacher) {
    const [assignment] = await db
      .select()
      .from(classTeachersTable)
      .where(
        and(
          eq(classTeachersTable.classId, classId),
          eq(classTeachersTable.teacherId, u.id),
        ),
      );
    const isLegacyTeacher = classData.teacherId === u.id;
    if (!assignment && !isLegacyTeacher) {
      res.status(403).json({ error: "You can only view leaderboard for your classes." });
      return;
    }
  }

  const enrollments = await db
    .select({ userId: classEnrollmentsTable.userId })
    .from(classEnrollmentsTable)
    .where(eq(classEnrollmentsTable.classId, classId));
  const studentIds = enrollments.map((row) => row.userId);

  if (studentIds.length === 0) {
    res.json({
      items: [],
      class: { id: classData.id, name: classData.name },
    });
    return;
  }

  const rows = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.role, "student"), inArray(usersTable.id, studentIds)))
    .orderBy(desc(usersTable.xp));

  const items = rows.map((student, i) => ({
    userId: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    xp: student.xp,
    level: student.level,
    grade: student.grade,
    rank: i + 1,
  }));

  res.json({
    items,
    class: { id: classData.id, name: classData.name },
  });
});

router.get("/gamification/me", requireAuth, async (req, res): Promise<void> => {
  const u = req.user!;
  const rows = await db
    .select({ a: achievementsTable, b: badgesTable })
    .from(achievementsTable)
    .innerJoin(badgesTable, eq(badgesTable.id, achievementsTable.badgeId))
    .where(eq(achievementsTable.userId, u.id));
  res.json({
    badges: rows.map((r) => ({
      id: r.a.id,
      userId: r.a.userId,
      badgeId: r.a.badgeId,
      earnedAt: r.a.earnedAt,
      badge: r.b,
    })),
    xp: u.xp,
    level: u.level,
    streak: u.streak,
  });
});

export default router;
