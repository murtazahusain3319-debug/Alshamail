import { Router, type IRouter } from "express";
import { eq, asc, inArray, and, or } from "drizzle-orm";
import { db, scheduleEventsTable, classesTable, classEnrollmentsTable, classTeachersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/schedule", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const isStudent = user.role === "student" && !user.isAdmin;
  const isTeacher = user.role === "teacher" && !user.isAdmin;

  let itemsQuery = db
    .select()
    .from(scheduleEventsTable)
    .orderBy(asc(scheduleEventsTable.startsAt));

  // Filter events for students - only show events relevant to them
  if (isStudent) {
    const enrolledClasses = await db
      .select({ classId: classEnrollmentsTable.classId })
      .from(classEnrollmentsTable)
      .where(eq(classEnrollmentsTable.userId, user.id));
    
    const enrolledClassIds = enrolledClasses.map((e) => e.classId);
    
    itemsQuery = itemsQuery.where(
      or(
        eq(scheduleEventsTable.audience, "all"),
        eq(scheduleEventsTable.audience, "students"),
        and(
          eq(scheduleEventsTable.audience, "class"),
          enrolledClassIds.length > 0 ? inArray(scheduleEventsTable.classId, enrolledClassIds) : eq(scheduleEventsTable.classId, 0)
        )
      )
    );
  }

  // Filter events for teachers - only show events relevant to them
  if (isTeacher) {
    const teacherClasses = await db
      .select({ classId: classTeachersTable.classId })
      .from(classTeachersTable)
      .where(eq(classTeachersTable.teacherId, user.id));
    
    // Also check legacy teacherId on classes table
    const legacyClasses = await db
      .select({ id: classesTable.id })
      .from(classesTable)
      .where(eq(classesTable.teacherId, user.id));
    
    const teacherClassIds = [...new Set([
      ...teacherClasses.map((e) => e.classId),
      ...legacyClasses.map((c) => c.id)
    ])];
    
    itemsQuery = itemsQuery.where(
      or(
        eq(scheduleEventsTable.audience, "all"),
        eq(scheduleEventsTable.audience, "teachers"),
        and(
          eq(scheduleEventsTable.audience, "class"),
          teacherClassIds.length > 0 ? inArray(scheduleEventsTable.classId, teacherClassIds) : eq(scheduleEventsTable.classId, 0)
        )
      )
    );
  }

  const items = await itemsQuery;

  // Fetch class names for events with classId
  const classIds = items.map((e) => e.classId).filter((id): id is number => id !== null);
  const classes = classIds.length > 0
    ? await db
        .select({ id: classesTable.id, name: classesTable.name })
        .from(classesTable)
        .where(inArray(classesTable.id, classIds))
    : [];
  
  const classMap = new Map(classes.map((c) => [c.id, c.name]));

  const itemsWithClassNames = items.map((item) => ({
    ...item,
    className: item.classId ? classMap.get(item.classId) ?? null : null,
    meetingUrl: item.link,
  }));

  res.json({ items: itemsWithClassNames });
});

router.post("/schedule", requireAuth, async (req, res): Promise<void> => {
  const d = req.body ?? {};
  if (!d.title || !d.startsAt) {
    res.status(400).json({ error: "Title and start time are required." });
    return;
  }
  const [ev] = await db
    .insert(scheduleEventsTable)
    .values({
      title: String(d.title),
      kind: typeof d.kind === "string" ? d.kind : "class",
      startsAt: new Date(d.startsAt),
      endsAt: d.endsAt ? new Date(d.endsAt) : null,
      location: d.location ?? null,
      link: d.meetingUrl ?? d.link ?? null,
      notes: d.description ?? d.notes ?? null,
      audience: typeof d.audience === "string" ? d.audience : "all",
      classId: typeof d.classId === "number" ? d.classId : null,
      createdBy: req.user!.id,
    })
    .returning();
  res.status(201).json(ev);
});

router.delete("/schedule/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  await db.delete(scheduleEventsTable).where(eq(scheduleEventsTable.id, id));
  res.json({ ok: true });
});

export default router;
