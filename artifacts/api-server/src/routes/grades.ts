import { Router, type IRouter } from "express";
import { eq, and, asc, inArray } from "drizzle-orm";
import {
  db,
  classesTable,
  classTeachersTable,
  classEnrollmentsTable,
  gradeSubjectsTable,
  gradeEntriesTable,
  usersTable,
  type DbUser,
} from "@workspace/db";
import { publicUser, requireAuth } from "../lib/auth";

const router: IRouter = Router();

function isAdminUser(user: DbUser): boolean {
  return user.role === "admin" || user.isAdmin;
}

function isStaffUser(user: DbUser): boolean {
  return isAdminUser(user) || user.role === "teacher";
}

async function teacherCanAccessClass(userId: number, classId: number): Promise<boolean> {
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, classId)).limit(1);
  if (!cls) return false;
  if (cls.teacherId === userId) return true;

  const [assignment] = await db
    .select()
    .from(classTeachersTable)
    .where(and(eq(classTeachersTable.classId, classId), eq(classTeachersTable.teacherId, userId)))
    .limit(1);
  return !!assignment;
}

async function teacherAllowedSubjectIds(userId: number, classId: number): Promise<Set<string>> {
  const allowed = new Set<string>();
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, classId)).limit(1);
  if (!cls) return allowed;

  const rows = await db
    .select({ subjects: classTeachersTable.subjects })
    .from(classTeachersTable)
    .where(and(eq(classTeachersTable.classId, classId), eq(classTeachersTable.teacherId, userId)));

  for (const row of rows) {
    const subjects = JSON.parse(row.subjects || "[]") as string[];
    subjects.forEach((subject) => {
      const normalized = String(subject ?? "").trim().toLowerCase();
      if (normalized) allowed.add(normalized);
    });
  }

  if (allowed.size === 0 && cls.teacherId === userId && cls.subject) {
    allowed.add(String(cls.subject).trim().toLowerCase());
  }

  return allowed;
}

function subjectMatchesAllowed(subjectId: string, subjectName: string, allowed: Set<string>): boolean {
  if (allowed.size === 0) return false;
  const idNorm = String(subjectId).trim().toLowerCase();
  const nameNorm = String(subjectName).trim().toLowerCase();
  return allowed.has(idNorm) || allowed.has(nameNorm);
}

async function teacherCanManageSubject(
  userId: number,
  classId: number,
  subjectId: string,
  subjectName: string,
): Promise<boolean> {
  if (!(await teacherCanAccessClass(userId, classId))) return false;
  const allowed = await teacherAllowedSubjectIds(userId, classId);
  return subjectMatchesAllowed(subjectId, subjectName, allowed);
}

async function studentEnrolledInClass(userId: number, classId: number): Promise<boolean> {
  const [row] = await db
    .select()
    .from(classEnrollmentsTable)
    .where(and(eq(classEnrollmentsTable.classId, classId), eq(classEnrollmentsTable.userId, userId)))
    .limit(1);
  return !!row;
}

async function studentClassIds(userId: number): Promise<number[]> {
  const rows = await db
    .select({ classId: classEnrollmentsTable.classId })
    .from(classEnrollmentsTable)
    .where(eq(classEnrollmentsTable.userId, userId));
  return rows.map((row) => row.classId);
}

async function teacherClassIds(userId: number): Promise<number[]> {
  const fromLegacy = await db
    .select({ id: classesTable.id })
    .from(classesTable)
    .where(eq(classesTable.teacherId, userId));
  const fromAssignments = await db
    .select({ classId: classTeachersTable.classId })
    .from(classTeachersTable)
    .where(eq(classTeachersTable.teacherId, userId));
  return [...new Set([...fromLegacy.map((r) => r.id), ...fromAssignments.map((r) => r.classId)])];
}

function formatGradeEntry(
  entry: typeof gradeEntriesTable.$inferSelect,
  student?: ReturnType<typeof publicUser> | null,
) {
  return {
    id: entry.id,
    classId: entry.classId,
    subjectId: entry.subjectId,
    subjectName: entry.subjectName,
    studentId: entry.studentId,
    student: student ?? null,
    title: entry.title,
    score: entry.score,
    maxScore: entry.maxScore,
    notes: entry.notes,
    createdBy: entry.createdBy,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

// List grade subjects (class + subject groupings)
router.get("/grades/subjects", requireAuth, async (req, res): Promise<void> => {
  const classIdParam = req.query.classId;
  const classId = classIdParam != null ? parseInt(String(classIdParam), 10) : null;
  const user = req.user!;

  let rows = await db.select().from(gradeSubjectsTable).orderBy(asc(gradeSubjectsTable.subjectName));

  if (Number.isFinite(classId)) {
    rows = rows.filter((row) => row.classId === classId);
  }

  if (isAdminUser(user)) {
    res.json({ items: rows });
    return;
  }

  if (user.role === "teacher") {
    const allowedClassIds = new Set(await teacherClassIds(user.id));
    const filtered = [];
    for (const row of rows) {
      if (!allowedClassIds.has(row.classId)) continue;
      const allowed = await teacherAllowedSubjectIds(user.id, row.classId);
      if (subjectMatchesAllowed(row.subjectId, row.subjectName, allowed)) {
        filtered.push(row);
      }
    }
    res.json({ items: filtered });
    return;
  }

  const enrolledIds = new Set(await studentClassIds(user.id));
  res.json({ items: rows.filter((row) => enrolledIds.has(row.classId)) });
});

// Create a grade subject for a class
router.post("/grades/subjects", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!isStaffUser(user)) {
    res.status(403).json({ error: "Only staff can create grade subjects." });
    return;
  }

  const d = req.body ?? {};
  const classId = parseInt(String(d.classId), 10);
  const subjectId = String(d.subjectId ?? "").trim();
  const subjectName = String(d.subjectName ?? "").trim();

  if (!Number.isFinite(classId) || !subjectId || !subjectName) {
    res.status(400).json({ error: "Class, subject ID, and subject name are required." });
    return;
  }

  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, classId)).limit(1);
  if (!cls) {
    res.status(404).json({ error: "Class not found." });
    return;
  }

  if (!isAdminUser(user)) {
    const canManage = await teacherCanManageSubject(user.id, classId, subjectId, subjectName);
    if (!canManage) {
      res.status(403).json({ error: "You are not assigned to teach this subject in this class." });
      return;
    }
  }

  const [existing] = await db
    .select()
    .from(gradeSubjectsTable)
    .where(and(eq(gradeSubjectsTable.classId, classId), eq(gradeSubjectsTable.subjectId, subjectId)))
    .limit(1);

  if (existing) {
    res.status(400).json({ error: "This subject already exists for this class." });
    return;
  }

  const [created] = await db
    .insert(gradeSubjectsTable)
    .values({
      classId,
      subjectId,
      subjectName,
      createdBy: user.id,
    })
    .returning();

  res.status(201).json(created);
});

// Delete a grade subject (and its entries)
router.delete("/grades/subjects/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!isStaffUser(user)) {
    res.status(403).json({ error: "Only staff can delete grade subjects." });
    return;
  }

  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }

  const [subject] = await db.select().from(gradeSubjectsTable).where(eq(gradeSubjectsTable.id, id)).limit(1);
  if (!subject) {
    res.status(404).json({ error: "Subject not found." });
    return;
  }

  if (!isAdminUser(user)) {
    const canManage = await teacherCanManageSubject(
      user.id,
      subject.classId,
      subject.subjectId,
      subject.subjectName,
    );
    if (!canManage) {
      res.status(403).json({ error: "You cannot delete this subject." });
      return;
    }
  }

  await db.delete(gradeEntriesTable).where(
    and(eq(gradeEntriesTable.classId, subject.classId), eq(gradeEntriesTable.subjectId, subject.subjectId)),
  );
  await db.delete(gradeSubjectsTable).where(eq(gradeSubjectsTable.id, id));
  res.json({ ok: true });
});

// List grade entries
router.get("/grades", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const classIdParam = req.query.classId;
  const subjectIdParam = req.query.subjectId;
  const classId = classIdParam != null ? parseInt(String(classIdParam), 10) : null;
  const subjectId = subjectIdParam != null ? String(subjectIdParam) : null;

  let rows = await db.select().from(gradeEntriesTable).orderBy(asc(gradeEntriesTable.title));

  if (Number.isFinite(classId)) {
    rows = rows.filter((row) => row.classId === classId);
  }
  if (subjectId) {
    rows = rows.filter((row) => row.subjectId === subjectId);
  }

  if (user.role === "student") {
    rows = rows.filter((row) => row.studentId === user.id);
  } else if (!isAdminUser(user) && user.role === "teacher") {
    const allowedClassIds = new Set(await teacherClassIds(user.id));
    const filtered = [];
    for (const row of rows) {
      if (!allowedClassIds.has(row.classId)) continue;
      const allowed = await teacherAllowedSubjectIds(user.id, row.classId);
      if (subjectMatchesAllowed(row.subjectId, row.subjectName, allowed)) {
        filtered.push(row);
      }
    }
    rows = filtered;
  }

  const studentIds = [...new Set(rows.map((row) => row.studentId))];
  const students = studentIds.length
    ? await db.select().from(usersTable).where(inArray(usersTable.id, studentIds))
    : [];
  const studentMap = new Map(students.map((s) => [s.id, publicUser(s)]));

  res.json({
    items: rows.map((row) => formatGradeEntry(row, studentMap.get(row.studentId))),
  });
});

// Create a grade entry
router.post("/grades", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!isStaffUser(user)) {
    res.status(403).json({ error: "Only staff can create grade entries." });
    return;
  }

  const d = req.body ?? {};
  const classId = parseInt(String(d.classId), 10);
  const subjectId = String(d.subjectId ?? "").trim();
  const subjectName = String(d.subjectName ?? "").trim();
  const studentId = parseInt(String(d.studentId), 10);
  const title = String(d.title ?? "").trim();
  const score = parseInt(String(d.score), 10);
  const maxScore = d.maxScore != null ? parseInt(String(d.maxScore), 10) : 100;
  const notes = d.notes != null ? String(d.notes) : null;

  if (
    !Number.isFinite(classId) ||
    !subjectId ||
    !subjectName ||
    !Number.isFinite(studentId) ||
    !title ||
    !Number.isFinite(score) ||
    !Number.isFinite(maxScore)
  ) {
    res.status(400).json({ error: "Class, subject, student, title, and score are required." });
    return;
  }

  if (score < 0 || maxScore <= 0 || score > maxScore) {
    res.status(400).json({ error: "Invalid score range." });
    return;
  }

  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, classId)).limit(1);
  if (!cls) {
    res.status(404).json({ error: "Class not found." });
    return;
  }

  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId)).limit(1);
  if (!student || student.role !== "student") {
    res.status(400).json({ error: "Student not found." });
    return;
  }

  if (!(await studentEnrolledInClass(studentId, classId))) {
    res.status(400).json({ error: "Student is not enrolled in this class." });
    return;
  }

  if (!isAdminUser(user)) {
    const canManage = await teacherCanManageSubject(user.id, classId, subjectId, subjectName);
    if (!canManage) {
      res.status(403).json({ error: "You are not assigned to grade this subject." });
      return;
    }
  }

  const [created] = await db
    .insert(gradeEntriesTable)
    .values({
      classId,
      subjectId,
      subjectName,
      studentId,
      title,
      score,
      maxScore,
      notes,
      createdBy: user.id,
    })
    .returning();

  res.status(201).json(formatGradeEntry(created, publicUser(student)));
});

// Update a grade entry
router.patch("/grades/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!isStaffUser(user)) {
    res.status(403).json({ error: "Only staff can update grade entries." });
    return;
  }

  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }

  const [existing] = await db.select().from(gradeEntriesTable).where(eq(gradeEntriesTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Grade entry not found." });
    return;
  }

  if (!isAdminUser(user)) {
    const canManage = await teacherCanManageSubject(
      user.id,
      existing.classId,
      existing.subjectId,
      existing.subjectName,
    );
    if (!canManage) {
      res.status(403).json({ error: "You cannot update this grade entry." });
      return;
    }
  }

  const d = req.body ?? {};
  const updates: Partial<typeof gradeEntriesTable.$inferInsert> = { updatedAt: new Date() };

  if (typeof d.title === "string" && d.title.trim()) updates.title = d.title.trim();
  if (d.score != null) {
    const score = parseInt(String(d.score), 10);
    if (!Number.isFinite(score)) {
      res.status(400).json({ error: "Invalid score." });
      return;
    }
    updates.score = score;
  }
  if (d.maxScore != null) {
    const maxScore = parseInt(String(d.maxScore), 10);
    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      res.status(400).json({ error: "Invalid max score." });
      return;
    }
    updates.maxScore = maxScore;
  }
  if (d.notes !== undefined) updates.notes = d.notes != null ? String(d.notes) : null;

  const nextScore = updates.score ?? existing.score;
  const nextMax = updates.maxScore ?? existing.maxScore;
  if (nextScore < 0 || nextScore > nextMax) {
    res.status(400).json({ error: "Invalid score range." });
    return;
  }

  const [updated] = await db
    .update(gradeEntriesTable)
    .set(updates)
    .where(eq(gradeEntriesTable.id, id))
    .returning();

  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, updated.studentId)).limit(1);
  res.json(formatGradeEntry(updated, student ? publicUser(student) : null));
});

// Delete a grade entry
router.delete("/grades/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!isStaffUser(user)) {
    res.status(403).json({ error: "Only staff can delete grade entries." });
    return;
  }

  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }

  const [existing] = await db.select().from(gradeEntriesTable).where(eq(gradeEntriesTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Grade entry not found." });
    return;
  }

  if (!isAdminUser(user)) {
    const canManage = await teacherCanManageSubject(
      user.id,
      existing.classId,
      existing.subjectId,
      existing.subjectName,
    );
    if (!canManage) {
      res.status(403).json({ error: "You cannot delete this grade entry." });
      return;
    }
  }

  await db.delete(gradeEntriesTable).where(eq(gradeEntriesTable.id, id));
  res.json({ ok: true });
});

export default router;
