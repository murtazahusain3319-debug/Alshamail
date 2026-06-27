import { Router, type IRouter } from "express";
import { eq, and, asc, inArray, sql } from "drizzle-orm";
import {
  db,
  classesTable,
  classEnrollmentsTable,
  classTeachersTable,
  usersTable,
  coursesTable,
  enrollmentsTable,
} from "@workspace/db";
import { publicUser, requireAdmin, requireAuth } from "../lib/auth";

const router: IRouter = Router();

// List all classes with student counts and teacher assignments
// Teachers only see classes they're assigned to
router.get("/classes", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const isTeacher = user.role === "teacher";
  const isAdmin = user.isAdmin;

  let classesQuery = db
    .select({
      id: classesTable.id,
      name: classesTable.name,
      subject: classesTable.subject,
      teacherId: classesTable.teacherId,
      createdAt: classesTable.createdAt,
    })
    .from(classesTable)
    .orderBy(asc(classesTable.name));

  // Filter classes for teachers - only show classes they're assigned to
  if (isTeacher && !isAdmin) {
    const teacherClassIds = await db
      .select({ classId: classTeachersTable.classId })
      .from(classTeachersTable)
      .where(eq(classTeachersTable.teacherId, user.id));
    
    const legacyClassIds = await db
      .select({ id: classesTable.id })
      .from(classesTable)
      .where(eq(classesTable.teacherId, user.id));
    
    const allClassIds = [...new Set([
      ...teacherClassIds.map((r) => r.classId),
      ...legacyClassIds.map((r) => r.id)
    ])];
    
    if (allClassIds.length === 0) {
      res.json({ items: [] });
      return;
    }
    
    classesQuery = classesQuery.where(inArray(classesTable.id, allClassIds));
  }

  const classes = await classesQuery;

  const classIds = classes.map((c) => c.id);
  const classTeacherRows = classIds.length
    ? await db
        .select({
          classId: classTeachersTable.classId,
          teacherId: classTeachersTable.teacherId,
          subjects: classTeachersTable.subjects,
        })
        .from(classTeachersTable)
        .where(inArray(classTeachersTable.classId, classIds))
    : [];

  const legacyTeacherIds = [...new Set(classes.filter((c) => c.teacherId).map((c) => c.teacherId))];
  const teacherIds = [...new Set([...classTeacherRows.map((row) => row.teacherId), ...legacyTeacherIds])];
  const teachers = teacherIds.length
    ? await db
        .select()
        .from(usersTable)
        .where(inArray(usersTable.id, teacherIds))
    : [];
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));

  const teacherAssignmentsMap = new Map<number, Array<{ teacher: ReturnType<typeof publicUser>; subjects: string[] }>>();
  for (const row of classTeacherRows) {
    const teacher = teacherMap.get(row.teacherId);
    if (!teacher) continue;
    const subjects = JSON.parse(row.subjects || "[]");
    const existing = teacherAssignmentsMap.get(row.classId) ?? [];
    existing.push({
      teacher: publicUser(teacher),
      subjects,
    });
    teacherAssignmentsMap.set(row.classId, existing);
  }

  const enrollments = classIds.length
    ? await db
        .select({
          classId: classEnrollmentsTable.classId,
          userId: classEnrollmentsTable.userId,
        })
        .from(classEnrollmentsTable)
        .where(inArray(classEnrollmentsTable.classId, classIds))
    : [];

  const studentIds = [...new Set(enrollments.map((e) => e.userId))];
  const students = studentIds.length
    ? await db.select().from(usersTable).where(inArray(usersTable.id, studentIds))
    : [];
  const studentMap = new Map(students.map((user) => [user.id, publicUser(user)]));

  const classStudentsMap = new Map<number, Array<ReturnType<typeof publicUser>>>();
  for (const enrollment of enrollments) {
    const student = studentMap.get(enrollment.userId);
    if (!student) continue;
    const list = classStudentsMap.get(enrollment.classId) ?? [];
    list.push(student);
    classStudentsMap.set(enrollment.classId, list);
  }

  const items = classes.map((c) => {
    let assignments = teacherAssignmentsMap.get(c.id) ?? [];
    // Legacy: class has teacherId but no class_teachers row yet
    if (assignments.length === 0 && c.teacherId) {
      const teacher = teacherMap.get(c.teacherId);
      if (teacher) {
        assignments = [{
          teacher: publicUser(teacher),
          subjects: c.subject ? [String(c.subject)] : [],
        }];
      }
    }
    const students = classStudentsMap.get(c.id) ?? [];
    return {
      ...c,
      teacherAssignments: assignments,
      studentCount: students.length,
      students,
    };
  });

  res.json({ items });
});

// Create a new class (admin only)
router.post("/classes", requireAdmin, async (req, res): Promise<void> => {
  const d = req.body ?? {};
  if (!d.name) {
    res.status(400).json({ error: "Name is required." });
    return;
  }

  // TeacherId is optional when creating
  let teacherId: number | null = null;
  if (typeof d.teacherId === "number") {
    teacherId = d.teacherId;
    const [teacher] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, teacherId));

    if (!teacher || teacher.role !== "teacher") {
      res.status(400).json({ error: "Teacher not found or user is not a teacher." });
      return;
    }
  }

  const [newClass] = await db
    .insert(classesTable)
    .values({
      name: String(d.name),
      subject: d.subject ? String(d.subject) : null,
      teacherId,
    })
    .returning();

  res.status(201).json({
    ...newClass,
    teacher: null,
    studentCount: 0,
  });
});

// Assign a teacher to a class, with one or more subjects
router.post("/classes/:id/teachers", requireAdmin, async (req, res): Promise<void> => {
  const classId = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(classId)) {
    res.status(400).json({ error: "Invalid class ID." });
    return;
  }

  const d = req.body ?? {};
  const teacherId = parseInt(String(d.teacherId), 10);
  if (!Number.isFinite(teacherId)) {
    res.status(400).json({ error: "Invalid teacher ID." });
    return;
  }

  const subjects = Array.isArray(d.subjects)
    ? d.subjects.map((subject: unknown) => String(subject ?? "").trim()).filter(Boolean)
    : [];

  if (subjects.length === 0) {
    res.status(400).json({ error: "At least one subject is required." });
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

  const [teacher] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, teacherId));
  if (!teacher || teacher.role !== "teacher") {
    res.status(400).json({ error: "Teacher not found or user is not a teacher." });
    return;
  }

  const [existing] = await db
    .select()
    .from(classTeachersTable)
    .where(
      and(
        eq(classTeachersTable.classId, classId),
        eq(classTeachersTable.teacherId, teacherId),
      ),
    );

  if (existing) {
    const existingSubjects = JSON.parse(existing.subjects || "[]") as string[];
    const normalizedExisting = new Set(
      existingSubjects.map((subject) => subject.trim().toLowerCase()),
    );
    const newSubjects = subjects.filter(
      (subject) => !normalizedExisting.has(subject.trim().toLowerCase()),
    );

    if (newSubjects.length === 0) {
      res.status(400).json({ error: "This teacher is already assigned to this subject." });
      return;
    }

    const mergedSubjects = [...existingSubjects, ...newSubjects];
    const [updated] = await db
      .update(classTeachersTable)
      .set({ subjects: JSON.stringify(mergedSubjects) })
      .where(eq(classTeachersTable.id, existing.id))
      .returning();

    res.status(200).json({
      ...updated,
      teacher: publicUser(teacher),
      subjects: mergedSubjects,
    });
    return;
  }

  // Legacy: teacher stored on classes.teacherId without a class_teachers row yet.
  if (classData.teacherId === teacherId) {
    const legacySubjects = classData.subject ? [String(classData.subject).trim()] : [];
    const normalizedExisting = new Set(
      legacySubjects.map((subject) => subject.trim().toLowerCase()),
    );
    const newSubjects = subjects.filter(
      (subject) => !normalizedExisting.has(subject.trim().toLowerCase()),
    );

    if (newSubjects.length === 0) {
      res.status(400).json({ error: "This teacher is already assigned to this subject." });
      return;
    }

    const mergedSubjects = [...legacySubjects, ...newSubjects];
    const [assignment] = await db
      .insert(classTeachersTable)
      .values({
        classId,
        teacherId,
        subjects: JSON.stringify(mergedSubjects),
      })
      .returning();

    res.status(201).json({
      ...assignment,
      teacher: publicUser(teacher),
      subjects: mergedSubjects,
    });
    return;
  }

  const [assignment] = await db
    .insert(classTeachersTable)
    .values({
      classId,
      teacherId,
      subjects: JSON.stringify(subjects),
    })
    .returning();

  res.status(201).json({
    ...assignment,
    teacher: publicUser(teacher),
    subjects,
  });
});

// Get a specific class with enrolled students
router.get("/classes/:id", requireAuth, async (req, res): Promise<void> => {
  const classId = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(classId)) {
    res.status(400).json({ error: "Invalid class ID." });
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

  // Get teacher assignments for this class
  const teacherRows = await db
    .select({
      teacherId: classTeachersTable.teacherId,
      subjects: classTeachersTable.subjects,
    })
    .from(classTeachersTable)
    .where(eq(classTeachersTable.classId, classId));

  const teacherIds = [...new Set(teacherRows.map((row) => row.teacherId))];
  const teachers = teacherIds.length
    ? await db.select().from(usersTable).where(inArray(usersTable.id, teacherIds))
    : [];
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const teacherAssignments = teacherRows
    .map((row) => {
      const teacher = teacherMap.get(row.teacherId);
      if (!teacher) return null;
      return {
        teacher: publicUser(teacher),
        subjects: JSON.parse(row.subjects || "[]"),
      };
    })
    .filter(Boolean) as Array<{ teacher: ReturnType<typeof publicUser>; subjects: string[] }>;

  // Fallback to existing single teacher field for compatibility.
  let teacher = null;
  if (teacherAssignments.length > 0) {
    teacher = teacherAssignments[0].teacher;
  } else if (classData.teacherId) {
    const [t] = await db.select().from(usersTable).where(eq(usersTable.id, classData.teacherId));
    teacher = t ? publicUser(t) : null;
  }

  // Get enrolled students
  const enrollments = await db
    .select()
    .from(classEnrollmentsTable)
    .where(eq(classEnrollmentsTable.classId, classId));

  const studentIds = enrollments.map((e) => e.userId);
  
  // Fetch all students efficiently using inArray
  const allStudents =
    studentIds.length > 0
      ? await db
          .select()
          .from(usersTable)
          .where(inArray(usersTable.id, studentIds))
      : [];

  res.json({
    ...classData,
    teacherAssignments,
    teacher,
    students: allStudents.map(publicUser),
  });
});

// Update a class (admin only)
router.patch("/classes/:id", requireAdmin, async (req, res): Promise<void> => {
  const classId = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(classId)) {
    res.status(400).json({ error: "Invalid class ID." });
    return;
  }

  const d = req.body ?? {};
  const updates: Partial<typeof classesTable.$inferInsert> = {};

  if (typeof d.name === "string") updates.name = d.name;
  if (typeof d.subject === "string") updates.subject = d.subject;
  if (typeof d.teacherId === "number") {
    const [teacher] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, d.teacherId));
    if (!teacher || teacher.role !== "teacher") {
      res.status(400).json({ error: "Invalid teacher." });
      return;
    }
    updates.teacherId = d.teacherId;
  }

  if (Object.keys(updates).length === 0) {
    const [classData] = await db
      .select()
      .from(classesTable)
      .where(eq(classesTable.id, classId));
    res.json(classData);
    return;
  }

  const [updated] = await db
    .update(classesTable)
    .set(updates)
    .where(eq(classesTable.id, classId))
    .returning();

  res.json(updated);
});

// Delete a class (admin only)
router.delete("/classes/:id", requireAdmin, async (req, res): Promise<void> => {
  const classId = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(classId)) {
    res.status(400).json({ error: "Invalid class ID." });
    return;
  }

  await db.delete(classesTable).where(eq(classesTable.id, classId));
  res.json({ ok: true });
});

// Enroll a student in a class (admin only)
router.post("/classes/:id/enroll", requireAdmin, async (req, res): Promise<void> => {
  const classId = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(classId)) {
    res.status(400).json({ error: "Invalid class ID." });
    return;
  }

  const userId = parseInt(String(req.body?.userId), 10);
  if (!Number.isFinite(userId)) {
    res.status(400).json({ error: "Invalid user ID." });
    return;
  }

  // Check class exists
  const [classData] = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.id, classId));
  if (!classData) {
    res.status(404).json({ error: "Class not found." });
    return;
  }

  // Check user exists and is a student
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user || user.role !== "student") {
    res.status(400).json({ error: "User not found or not a student." });
    return;
  }

  // Check if already enrolled
  const [existing] = await db
    .select()
    .from(classEnrollmentsTable)
    .where(
      and(
        eq(classEnrollmentsTable.classId, classId),
        eq(classEnrollmentsTable.userId, userId),
      ),
    );

  if (existing) {
    res.status(400).json({ error: "Student already enrolled in this class." });
    return;
  }

  const [enrollment] = await db
    .insert(classEnrollmentsTable)
    .values({ classId, userId })
    .returning();

  // Auto-enroll student in courses taught by class teachers for the assigned subjects
  try {
    // Get teacher assignments for this class
    const teacherRows = await db
      .select({
        teacherId: classTeachersTable.teacherId,
        subjects: classTeachersTable.subjects,
      })
      .from(classTeachersTable)
      .where(eq(classTeachersTable.classId, classId));

    if (teacherRows.length > 0) {
      // Collect all subjects from all teacher assignments
      const allSubjects = new Set<string>();
      for (const row of teacherRows) {
        const subjects = JSON.parse(row.subjects || "[]") as string[];
        subjects.forEach((s) => allSubjects.add(s));
      }

      // Get all teacher IDs
      const teacherIds = teacherRows.map((row) => row.teacherId);

      // Find courses taught by these teachers for the assigned subjects
      const relevantCourses = await db
        .select({
          id: coursesTable.id,
        })
        .from(coursesTable)
        .where(
          and(
            inArray(coursesTable.teacherId, teacherIds),
            inArray(coursesTable.subject, Array.from(allSubjects))
          )
        );

      // Enroll student in all relevant courses (ignore conflicts)
      for (const course of relevantCourses) {
        try {
          await db.insert(enrollmentsTable).values({
            userId,
            courseId: course.id,
          });
        } catch {
          // Student might already be enrolled in this course, ignore
        }
      }
    }
  } catch (err) {
    console.error("Failed to auto-enroll student in courses:", err);
    // Don't fail the class enrollment if course enrollment fails
  }

  res.status(201).json(enrollment);
});

// Remove a student from a class (admin only)
router.delete(
  "/classes/:classId/enroll/:userId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const classId = parseInt(String(req.params.classId), 10);
    const userId = parseInt(String(req.params.userId), 10);

    if (!Number.isFinite(classId) || !Number.isFinite(userId)) {
      res.status(400).json({ error: "Invalid class or user ID." });
      return;
    }

    await db
      .delete(classEnrollmentsTable)
      .where(
        and(
          eq(classEnrollmentsTable.classId, classId),
          eq(classEnrollmentsTable.userId, userId),
        ),
      );

    res.json({ ok: true });
  },
);

// Update a teacher's assigned subjects in a class (admin only)
router.patch(
  "/classes/:classId/teachers/:teacherId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const classId = parseInt(String(req.params.classId), 10);
    const teacherId = parseInt(String(req.params.teacherId), 10);

    if (!Number.isFinite(classId) || !Number.isFinite(teacherId)) {
      res.status(400).json({ error: "Invalid class or teacher ID." });
      return;
    }

    const d = req.body ?? {};
    if (!Array.isArray(d.subjects)) {
      res.status(400).json({ error: "Subjects array is required." });
      return;
    }

    const subjects = d.subjects
      .map((subject: unknown) => String(subject ?? "").trim())
      .filter(Boolean);

    const [classData] = await db
      .select()
      .from(classesTable)
      .where(eq(classesTable.id, classId));
    if (!classData) {
      res.status(404).json({ error: "Class not found." });
      return;
    }

    const [teacher] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, teacherId));
    if (!teacher || teacher.role !== "teacher") {
      res.status(400).json({ error: "Teacher not found or user is not a teacher." });
      return;
    }

    const [existing] = await db
      .select()
      .from(classTeachersTable)
      .where(
        and(
          eq(classTeachersTable.classId, classId),
          eq(classTeachersTable.teacherId, teacherId),
        ),
      );

    const removeTeacher = async (): Promise<void> => {
      if (existing) {
        await db.delete(classTeachersTable).where(
          and(
            eq(classTeachersTable.classId, classId),
            eq(classTeachersTable.teacherId, teacherId),
          ),
        );
      }
      if (classData.teacherId === teacherId) {
        await db
          .update(classesTable)
          .set({ teacherId: null, subject: null })
          .where(eq(classesTable.id, classId));
      }
    };

    if (subjects.length === 0) {
      await removeTeacher();
      res.json({ ok: true, removed: true });
      return;
    }

    if (existing) {
      const [updated] = await db
        .update(classTeachersTable)
        .set({ subjects: JSON.stringify(subjects) })
        .where(eq(classTeachersTable.id, existing.id))
        .returning();

      res.json({
        ...updated,
        teacher: publicUser(teacher),
        subjects,
      });
      return;
    }

    if (classData.teacherId === teacherId) {
      const [assignment] = await db
        .insert(classTeachersTable)
        .values({
          classId,
          teacherId,
          subjects: JSON.stringify(subjects),
        })
        .returning();

      await db
        .update(classesTable)
        .set({ teacherId: null, subject: null })
        .where(eq(classesTable.id, classId));

      res.json({
        ...assignment,
        teacher: publicUser(teacher),
        subjects,
      });
      return;
    }

    res.status(404).json({ error: "Teacher assignment not found." });
  },
);

// Remove a teacher assignment from a class (admin only)
router.delete(
  "/classes/:classId/teachers/:teacherId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const classId = parseInt(String(req.params.classId), 10);
    const teacherId = parseInt(String(req.params.teacherId), 10);

    if (!Number.isFinite(classId) || !Number.isFinite(teacherId)) {
      res.status(400).json({ error: "Invalid class or teacher ID." });
      return;
    }

    // Check if an explicit class_teachers assignment exists
    const [existing] = await db
      .select()
      .from(classTeachersTable)
      .where(
        and(
          eq(classTeachersTable.classId, classId),
          eq(classTeachersTable.teacherId, teacherId),
        ),
      );

    if (existing) {
      await db.delete(classTeachersTable).where(
        and(
          eq(classTeachersTable.classId, classId),
          eq(classTeachersTable.teacherId, teacherId),
        ),
      );
      res.json({ ok: true });
      return;
    }

    // Fallback: clear legacy single teacherId on classes table if it matches
    const [classRow] = await db.select().from(classesTable).where(eq(classesTable.id, classId)).limit(1);
    if (classRow && classRow.teacherId === teacherId) {
      await db.update(classesTable).set({ teacherId: null }).where(eq(classesTable.id, classId));
      res.json({ ok: true });
      return;
    }

    res.status(404).json({ error: "Teacher assignment not found." });
  },
);

export default router;
