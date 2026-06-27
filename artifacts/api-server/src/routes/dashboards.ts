import { Router, type IRouter } from "express";
import { eq, and, desc, asc, sql, gte, gt, count, inArray } from "drizzle-orm";
import {
  db,
  usersTable,
  coursesTable,
  lessonsTable,
  enrollmentsTable,
  lessonProgressTable,
  quizAttemptsTable,
  achievementsTable,
  badgesTable,
  scheduleEventsTable,
  applicationsTable,
  xpEventsTable,
} from "@workspace/db";
import { publicUser, requireAuth } from "../lib/auth";
import { levelForXp } from "../lib/level";

const router: IRouter = Router();

async function shapeCourse(c: typeof coursesTable.$inferSelect) {
  const [{ lc }] = await db
    .select({ lc: sql<number>`count(*)::int` })
    .from(lessonsTable)
    .where(eq(lessonsTable.courseId, c.id));
  const [{ ec }] = await db
    .select({ ec: sql<number>`count(*)::int` })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.courseId, c.id));
  let teacherName = "Staff";
  if (c.teacherId) {
    const [t] = await db
      .select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable)
      .where(eq(usersTable.id, c.teacherId))
      .limit(1);
    if (t) teacherName = `${t.firstName} ${t.lastName}`;
  }
  return { ...c, lessonCount: lc, enrolledCount: ec, teacherName };
}

router.get("/dashboards/student", requireAuth, async (req, res): Promise<void> => {
  const u = req.user!;
  try {
    // Fetch fresh user data from database to get latest XP and level
    const [freshUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, u.id))
      .limit(1);
    
    if (!freshUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const myEnrolls = await db
      .select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.userId, u.id));
    const courseIds = myEnrolls
      .map((e) => Number(e.courseId))
      .filter((id) => Number.isFinite(id));
    const myCourses = courseIds.length > 0
      ? await db.select().from(coursesTable).where(inArray(coursesTable.id, courseIds))
      : [];
    const allLessons = courseIds.length > 0
      ? await db.select().from(lessonsTable).where(inArray(lessonsTable.courseId, courseIds))
      : [];
    const myProgress = await db
      .select()
      .from(lessonProgressTable)
      .where(eq(lessonProgressTable.userId, u.id));
    const completedSet = new Set(myProgress.map((p) => p.lessonId));

    const enrollDetail = (await Promise.all(
      myEnrolls.map(async (e) => {
        const courseId = Number(e.courseId);
        if (!Number.isFinite(courseId)) {
          return null;
        }
        const c = myCourses.find((x) => x.id === courseId);
        if (!c) {
          return null;
        }
        const courseLessons = allLessons.filter((l) => l.courseId === courseId);
        const completed = courseLessons.filter((l) => completedSet.has(l.id));
        const progress = courseLessons.length > 0 ? Math.round((completed.length / courseLessons.length) * 100) : 0;
        const shaped = await shapeCourse(c);
        return {
          id: e.id,
          courseId: c.id,
          course: shaped,
          totalLessonCount: courseLessons.length,
          completedLessonCount: completed.length,
          progress,
        };
      }),
    )).filter((r): r is NonNullable<typeof r> => r !== null);

    const myAttempts = await db
      .select()
      .from(quizAttemptsTable)
      .where(eq(quizAttemptsTable.userId, u.id));
    const completedQuizCount = myAttempts.length;
    const avgQuizScore = myAttempts.length
      ? Math.round(myAttempts.reduce((s, a) => s + a.score, 0) / myAttempts.length)
      : 0;

    const lvl = levelForXp(freshUser.xp);

    const allStudents = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.role, "student"))
      .orderBy(desc(usersTable.xp));
    const rank = allStudents.findIndex((x) => x.id === u.id) + 1;
    const leaderboard = allStudents.slice(0, 8).map((x, i) => ({
      userId: x.id,
      firstName: x.firstName,
      lastName: x.lastName,
      xp: x.xp,
      rank: i + 1,
    }));

    const myAchievements = await db
      .select({ a: achievementsTable, b: badgesTable })
      .from(achievementsTable)
      .innerJoin(badgesTable, eq(badgesTable.id, achievementsTable.badgeId))
      .where(eq(achievementsTable.userId, u.id))
      .orderBy(desc(achievementsTable.earnedAt))
      .limit(6);
    const recentBadges = myAchievements.map((r) => ({
      id: r.a.id,
      earnedAt: r.a.earnedAt,
      badge: r.b,
    }));

    const upcomingEvents = await db
      .select()
      .from(scheduleEventsTable)
      .where(gte(scheduleEventsTable.startsAt, new Date(Date.now() - 1000 * 60 * 60)))
      .orderBy(asc(scheduleEventsTable.startsAt))
      .limit(5);

    const xpRows = await db
      .select({
        day: sql<string>`to_char(${xpEventsTable.at}, 'YYYY-MM-DD')`,
        count: sql<number>`sum(${xpEventsTable.amount})::int`,
      })
      .from(xpEventsTable)
      .where(eq(xpEventsTable.userId, u.id))
      .groupBy(sql`to_char(${xpEventsTable.at}, 'YYYY-MM-DD')`);

    res.json({
      rank,
      currentLevelXp: lvl.currentLevelXp,
      nextLevelXp: lvl.nextLevelXp,
      stats: { userId: freshUser.id, xp: freshUser.xp, level: lvl.level, streak: freshUser.streak },
      enrolledCount: myEnrolls.length,
      completedLessonCount: myProgress.length,
      completedQuizCount,
      avgQuizScore,
      enrollments: enrollDetail,
      upcomingEvents,
      xpByDay: xpRows,
      leaderboard,
      recentBadges,
    });
  } catch (err) {
    req.log?.error({ err, userId: u.id }, "student dashboard failed");
    throw err;
  }
});

router.get("/dashboards/teacher", requireAuth, async (req, res): Promise<void> => {
  const u = req.user!;
  const myCourses = await db.select().from(coursesTable).where(eq(coursesTable.teacherId, u.id));
  const myCourseIds = myCourses.map((c) => c.id);
  const myEnrollments = myCourseIds.length > 0
    ? await db.select().from(enrollmentsTable).where(inArray(enrollmentsTable.courseId, myCourseIds))
    : [];
  const myStudentIds = [...new Set(myEnrollments.map((e) => e.userId))];

  const allEvents = await db.select().from(scheduleEventsTable);
  const now = Date.now();
  const upcomingEvents = allEvents
    .filter((e) => new Date(e.startsAt).getTime() >= now - 1000 * 60 * 60)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 5);
  const upcomingClassCount = allEvents.filter(
    (e) => e.kind === "class" && new Date(e.startsAt).getTime() >= now - 1000 * 60 * 60,
  ).length;

  const myLessons = myCourseIds.length > 0
    ? await db.select().from(lessonsTable).where(inArray(lessonsTable.courseId, myCourseIds))
    : [];
  const myLessonIds = myLessons.map((l) => l.id);
  const completedRows = myLessonIds.length > 0
    ? await db
        .select()
        .from(lessonProgressTable)
        .where(inArray(lessonProgressTable.lessonId, myLessonIds))
    : [];

  const dayMap = new Map<string, number>();
  for (const p of completedRows) {
    const day = new Date(p.completedAt).toISOString().slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const engagementByDay = [...dayMap.entries()].map(([day, count]) => ({ day, count }));

  const myStudents = myStudentIds.length > 0
    ? (await db
        .select()
        .from(usersTable)
        .where(inArray(usersTable.id, myStudentIds)))
        .sort((a, b) => b.xp - a.xp)
        .map((s) => publicUser(s))
    : [];

  const shapedCourses = await Promise.all(myCourses.map(shapeCourse));

  res.json({
    myCourseCount: myCourses.length,
    myStudentCount: myStudentIds.length,
    upcomingClassCount,
    completedLessonCount: completedRows.length,
    myCourses: shapedCourses,
    upcomingEvents,
    engagementByDay,
    myStudents,
  });
});

router.get("/dashboards/admin", requireAuth, async (_req, res): Promise<void> => {
  const [stuRow] = await db.select({ c: count() }).from(usersTable).where(eq(usersTable.role, "student"));
  const [tchRow] = await db.select({ c: count() }).from(usersTable).where(eq(usersTable.role, "teacher"));
  const [crsRow] = await db.select({ c: count() }).from(coursesTable);
  const [lsnRow] = await db.select({ c: count() }).from(lessonsTable);
  const [pendRow] = await db.select({ c: count() }).from(applicationsTable).where(eq(applicationsTable.status, "pending"));
  const [upRow] = await db.select({ c: count() }).from(scheduleEventsTable).where(gte(scheduleEventsTable.startsAt, new Date()));
  const [xpRow] = await db.select({ s: sql<number>`coalesce(sum(${usersTable.xp}), 0)::int` }).from(usersTable);
  const [bdgRow] = await db.select({ c: count() }).from(achievementsTable);

  const apps = await db.select().from(applicationsTable);
  const dayMap = new Map<string, number>();
  for (const a of apps) {
    const day = new Date(a.createdAt).toISOString().slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const applicationsByDay = [...dayMap.entries()].map(([day, count]) => ({ day, count }));

  const enrollments = await db.select().from(enrollmentsTable);
  const allCourses = await db.select().from(coursesTable);
  const courseById = new Map(allCourses.map((c) => [c.id, c]));
  const subjMap = new Map<string, number>();
  for (const e of enrollments) {
    const c = courseById.get(e.courseId);
    if (!c) continue;
    subjMap.set(c.subject, (subjMap.get(c.subject) ?? 0) + 1);
  }
  const enrollmentsBySubject = [...subjMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const recentApplications = [...apps]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const topStudents = (
    await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.role, "student"))
      .orderBy(desc(usersTable.xp))
      .limit(6)
  ).map((u, i) => ({
    userId: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    xp: u.xp,
    level: u.level,
    grade: u.grade,
    rank: i + 1,
  }));

  res.json({
    totalStudents: Number(stuRow?.c ?? 0),
    totalTeachers: Number(tchRow?.c ?? 0),
    totalCourses: Number(crsRow?.c ?? 0),
    totalLessons: Number(lsnRow?.c ?? 0),
    pendingApplications: Number(pendRow?.c ?? 0),
    upcomingEventCount: Number(upRow?.c ?? 0),
    totalXpAwarded: Number(xpRow?.s ?? 0),
    totalBadgesAwarded: Number(bdgRow?.c ?? 0),
    applicationsByDay,
    enrollmentsBySubject,
    recentApplications,
    topStudents,
  });
});

export default router;
