import { Router, type IRouter } from "express";
import { eq, and, asc, sql, inArray } from "drizzle-orm";
import {
  db,
  coursesTable,
  lessonsTable,
  enrollmentsTable,
  lessonProgressTable,
  usersTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

async function shapeCourses(rows: (typeof coursesTable.$inferSelect)[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((c) => c.id);
  const teacherIds = [...new Set(rows.map((c) => c.teacherId).filter(Boolean) as number[])];

  const lessonCounts = await db
    .select({ courseId: lessonsTable.courseId, c: sql<number>`count(*)::int` })
    .from(lessonsTable)
    .where(inArray(lessonsTable.courseId, ids))
    .groupBy(lessonsTable.courseId);
  const enrollCounts = await db
    .select({ courseId: enrollmentsTable.courseId, c: sql<number>`count(*)::int` })
    .from(enrollmentsTable)
    .where(inArray(enrollmentsTable.courseId, ids))
    .groupBy(enrollmentsTable.courseId);
  const teachers =
    teacherIds.length > 0
      ? await db
          .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
          .from(usersTable)
          .where(inArray(usersTable.id, teacherIds))
      : [];

  const lessonMap = new Map(lessonCounts.map((r) => [r.courseId, r.c]));
  const enrollMap = new Map(enrollCounts.map((r) => [r.courseId, r.c]));
  const teacherMap = new Map(teachers.map((t) => [t.id, `${t.firstName} ${t.lastName}`]));

  return rows.map((c) => ({
    ...c,
    lessonCount: lessonMap.get(c.id) ?? 0,
    enrolledCount: enrollMap.get(c.id) ?? 0,
    teacherName: c.teacherId ? teacherMap.get(c.teacherId) ?? "Staff" : "Staff",
  }));
}

router.get("/courses", async (req, res): Promise<void> => {
  const teacherId = req.query.teacherId ? parseInt(String(req.query.teacherId), 10) : undefined;
  
  let rows;
  if (teacherId && Number.isFinite(teacherId)) {
    const ownedCourses = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.teacherId, teacherId));

    const enrolledCourseIds = await db
      .select({ courseId: enrollmentsTable.courseId })
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.userId, teacherId));

    const courseIds = [
      ...new Set([
        ...ownedCourses.map((c) => c.id),
        ...enrolledCourseIds.map((row) => row.courseId),
      ]),
    ];

    if (courseIds.length > 0) {
      rows = await db
        .select()
        .from(coursesTable)
        .where(inArray(coursesTable.id, courseIds))
        .orderBy(asc(coursesTable.id));
    } else {
      rows = [];
    }
  } else {
    rows = await db
      .select()
      .from(coursesTable)
      .orderBy(asc(coursesTable.id));
  }
  
  res.json({ items: await shapeCourses(rows) });
});

router.get("/courses/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const [c] = await db.select().from(coursesTable).where(eq(coursesTable.id, id)).limit(1);
  if (!c) {
    res.json({ course: null, lessons: [], enrolled: false, completedLessonIds: [], progress: 0 });
    return;
  }
  const courseLessons = await db
    .select()
    .from(lessonsTable)
    .where(eq(lessonsTable.courseId, id))
    .orderBy(asc(lessonsTable.order));

  let enrolled = false;
  let completedLessonIds: number[] = [];
  if (req.user) {
    const e = await db
      .select({ id: enrollmentsTable.id })
      .from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.userId, req.user.id), eq(enrollmentsTable.courseId, id)))
      .limit(1);
    enrolled = e.length > 0;
    if (courseLessons.length > 0) {
      const lessonIds = courseLessons.map((l) => l.id);
      const done = await db
        .select({ lessonId: lessonProgressTable.lessonId })
        .from(lessonProgressTable)
        .where(
          and(
            eq(lessonProgressTable.userId, req.user.id),
            inArray(lessonProgressTable.lessonId, lessonIds),
          ),
        );
      completedLessonIds = done.map((d) => d.lessonId);
    }
  }
  const progress =
    courseLessons.length > 0
      ? Math.round((completedLessonIds.length / courseLessons.length) * 100)
      : 0;

  const [shaped] = await shapeCourses([c]);
  res.json({
    course: shaped,
    lessons: courseLessons.map((l) => ({ ...l, durationMinutes: l.durationMin, xpReward: l.xpReward ?? 50 })),
    enrolled,
    completedLessonIds,
    progress,
  });
});

router.post("/courses", requireAuth, async (req, res): Promise<void> => {
  const d = req.body ?? {};
  const title = String(d.title ?? "").trim();
  const subject = String(d.subject ?? "").trim();
  if (!title || !subject) {
    res.status(400).json({ error: "Title and subject are required." });
    return;
  }
  const [c] = await db
    .insert(coursesTable)
    .values({
      title,
      subject,
      level: d.level ?? "Year 5",
      description: d.description ?? "",
      thumbnailUrl: typeof d.thumbnailUrl === "string" && d.thumbnailUrl.trim() ? d.thumbnailUrl.trim() : null,
      bannerUrl: typeof d.bannerUrl === "string" && d.bannerUrl.trim() ? d.bannerUrl.trim() : null,
      coverEmoji: d.coverEmoji ?? "📘",
      coverColor: d.coverColor ?? "#1B2B5E",
      teacherId: req.user!.id,
      published: !!d.published,
    })
    .returning();

  if (req.user?.isAdmin || req.user?.role === "teacher") {
    const existingEnrollment = await db
      .select({ id: enrollmentsTable.id })
      .from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.userId, req.user!.id), eq(enrollmentsTable.courseId, c.id)))
      .limit(1);

    if (existingEnrollment.length === 0) {
      await db.insert(enrollmentsTable).values({ userId: req.user!.id, courseId: c.id });
    }
  }

  res.status(201).json(c);
});

router.patch("/courses/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const updates: Partial<typeof coursesTable.$inferInsert> = {};
  const isAdmin = !!req.user?.isAdmin;
  for (const f of ["title", "subject", "level", "description", "thumbnailUrl", "bannerUrl", "coverEmoji", "coverColor", "published"] as const) {
    if (req.body && f in req.body) (updates as any)[f] = req.body[f];
  }
  if (req.body && "teacherId" in req.body) {
    if (!isAdmin) {
      res.status(403).json({ error: "Only admins can change the course teacher." });
      return;
    }
    const rawTeacherId = req.body.teacherId;
    if (rawTeacherId === null) {
      (updates as any).teacherId = null;
    } else {
      const teacherId = parseInt(String(rawTeacherId), 10);
      if (!Number.isFinite(teacherId)) {
        res.status(400).json({ error: "Invalid teacher ID." });
        return;
      }
      const [teacher] = await db.select().from(usersTable).where(eq(usersTable.id, teacherId));
      if (!teacher || teacher.role !== "teacher") {
        res.status(400).json({ error: "Teacher not found or user is not a teacher." });
        return;
      }
      (updates as any).teacherId = teacherId;
    }
  }
  if ("thumbnailUrl" in updates) {
    const raw = (updates as any).thumbnailUrl;
    (updates as any).thumbnailUrl =
      typeof raw === "string" && raw.trim() ? raw.trim() : null;
  }
  if ("bannerUrl" in updates) {
    const raw = (updates as any).bannerUrl;
    (updates as any).bannerUrl =
      typeof raw === "string" && raw.trim() ? raw.trim() : null;
  }
  if (Object.keys(updates).length === 0) {
    res.json({ ok: true });
    return;
  }
  const [c] = await db
    .update(coursesTable)
    .set(updates)
    .where(eq(coursesTable.id, id))
    .returning();
  if (!c) {
    res.status(404).json({ error: "Course not found." });
    return;
  }
  res.json(c);
});

router.delete("/courses/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const u = req.user!;
  const [existing] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Course not found." });
    return;
  }
  // Admins can delete any course; teachers only their own.
  const isAdmin = !!u.isAdmin;
  if (!isAdmin && existing.teacherId !== u.id) {
    res.status(403).json({ error: "Only the course owner or an admin can delete this course." });
    return;
  }
  await db.delete(coursesTable).where(eq(coursesTable.id, id));
  res.json({ ok: true });
});

router.post("/courses/:id/enroll", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const existing = await db
    .select({ id: enrollmentsTable.id })
    .from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, req.user!.id), eq(enrollmentsTable.courseId, id)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(enrollmentsTable).values({ userId: req.user!.id, courseId: id });
  }
  res.json({ ok: true, courseId: id });
});

/* Admin: enroll user by email into a course */
router.post("/courses/:id/enroll-user", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid course id." });
    return;
  }

  // Check admin permission
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  const { email, role } = req.body;
  if (!email || !email.trim()) {
    res.status(400).json({ error: "Email is required." });
    return;
  }

  // Find user by email
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.trim()))
    .limit(1);

  if (users.length === 0) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  const user = users[0];
  const courseId = id;

  // Check if already enrolled
  const existing = await db
    .select({ id: enrollmentsTable.id })
    .from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, user.id), eq(enrollmentsTable.courseId, courseId)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(enrollmentsTable).values({ userId: user.id, courseId });
  }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
  if (course && !course.teacherId && role === "teacher") {
    await db.update(coursesTable).set({ teacherId: user.id }).where(eq(coursesTable.id, courseId));
  }

  res.json({ ok: true, courseId, userId: user.id, email });
});

router.delete("/courses/:id/members/:userId", requireAuth, async (req, res): Promise<void> => {
  const courseId = parseInt(String(req.params.id), 10);
  const userId = parseInt(String(req.params.userId), 10);
  if (!Number.isFinite(courseId) || !Number.isFinite(userId)) {
    res.status(400).json({ error: "Invalid course or user id." });
    return;
  }

  if (!req.user?.isAdmin) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  const existing = await db
    .select({ id: enrollmentsTable.id })
    .from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, courseId)))
    .limit(1);

  if (existing.length === 0) {
    res.status(404).json({ error: "User is not enrolled in this course." });
    return;
  }

  await db.delete(enrollmentsTable).where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, courseId)));
  res.json({ ok: true, courseId, userId });
});

/* My enrollments — returns shaped courses + per-course progress for the current user. */
router.get("/me/enrollments", requireAuth, async (req, res): Promise<void> => {
  const u = req.user!;
  const enrolls = await db
    .select()
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.userId, u.id));
  if (enrolls.length === 0) {
    res.json({ items: [] });
    return;
  }
  const courseIds = enrolls.map((e) => e.courseId);
  const courses = await db
    .select()
    .from(coursesTable)
    .where(inArray(coursesTable.id, courseIds));
  const lessons = await db
    .select()
    .from(lessonsTable)
    .where(inArray(lessonsTable.courseId, courseIds));
  const lessonIdList = lessons.map((l) => l.id);
  const progress = lessonIdList.length
    ? await db
        .select()
        .from(lessonProgressTable)
        .where(
          and(
            eq(lessonProgressTable.userId, u.id),
            inArray(lessonProgressTable.lessonId, lessonIdList),
          ),
        )
    : [];
  const completedLessonSet = new Set(progress.map((p) => p.lessonId));
  const shapedCourses = await shapeCourses(courses);
  const shapedById = new Map(shapedCourses.map((c) => [c.id, c]));

  const items = enrolls.map((e) => {
    const course = shapedById.get(e.courseId)!;
    const courseLessons = lessons.filter((l) => l.courseId === e.courseId);
    const completed = courseLessons.filter((l) => completedLessonSet.has(l.id));
    const pct = courseLessons.length > 0 ? Math.round((completed.length / courseLessons.length) * 100) : 0;
    return {
      id: e.id,
      userId: e.userId,
      courseId: e.courseId,
      course,
      totalLessonCount: courseLessons.length,
      completedLessonCount: completed.length,
      progress: pct,
    };
  });
  res.json({ items });
});

/* Get course members grouped by role */
router.get("/courses/:id/members", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }

  const [c] = await db.select().from(coursesTable).where(eq(coursesTable.id, id)).limit(1);
  if (!c) {
    res.json({ admins: [], teachers: [], students: [] });
    return;
  }

  // Get all enrollments for this course
  const enrollments = await db
    .select()
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.courseId, id));

  let userIds = enrollments.map((e) => e.userId);

  // Always include admins in the member list so students can see course admins too.
  const adminRows = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.isAdmin, true));
  for (const admin of adminRows) {
    if (!userIds.includes(admin.id)) {
      userIds.push(admin.id);
    }
  }

  if (userIds.length === 0) {
    res.json({ admins: [], teachers: [], students: [] });
    return;
  }

  const users = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.id, userIds));

  // Group users by role
  const admins = users.filter((u) => u.isAdmin).map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: "admin",
  }));

  const teachers = users.filter((u) => !u.isAdmin && u.role === "teacher").map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: "teacher",
  }));

  const students = users.filter((u) => !u.isAdmin && u.role !== "teacher").map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: "student",
  }));

  res.json({ admins, teachers, students });
});

export default router;
