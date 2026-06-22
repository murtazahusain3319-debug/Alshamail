import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, desc } from "drizzle-orm";
import { db, applicationsTable, usersTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/applications", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(applicationsTable)
    .orderBy(desc(applicationsTable.createdAt));
  res.json({ applications: rows });
});

router.post("/applications", async (req, res): Promise<void> => {
  const d = req.body ?? {};
  const firstName = String(d.firstName ?? "").trim();
  const lastName = String(d.lastName ?? "").trim();
  const email = String(d.email ?? "").trim().toLowerCase();
  if (!firstName || !lastName || !email) {
    res.status(400).json({ error: "Name and email are required." });
    return;
  }
  const role = d.role === "teacher" ? "teacher" : "student";
  const [app] = await db
    .insert(applicationsTable)
    .values({
      firstName,
      lastName,
      email,
      phone: d.phone ?? null,
      city: d.city ?? null,
      role,
      status: "pending",
      grade: d.grade ?? null,
      school: d.school ?? null,
      parentName: d.parentName ?? null,
      parentPhone: d.parentPhone ?? null,
      department: d.department ?? null,
      qualification: d.qualification ?? null,
      experience: d.experience ?? null,
      subjects: d.subjects ?? null,
      notes: d.notes ?? null,
    })
    .returning();
  res.status(201).json({ application: app });
});

router.patch("/applications/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const status = req.body?.status;
  if (!["pending", "approved", "rejected"].includes(String(status))) {
    res.status(400).json({ error: "Invalid status." });
    return;
  }
  const [app] = await db
    .update(applicationsTable)
    .set({ status })
    .where(eq(applicationsTable.id, id))
    .returning();
  if (!app) {
    res.status(404).json({ error: "Application not found." });
    return;
  }

  // On approval, create a user account if one doesn't already exist for the email.
  if (status === "approved") {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, app.email))
      .limit(1);
    if (existing.length === 0) {
      const tempPassword = app.role === "teacher" ? "teacher123" : "student123";
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      try {
        await db.insert(usersTable).values({
          firstName: app.firstName,
          lastName: app.lastName,
          email: app.email,
          role: app.role,
          isAdmin: false,
          passwordHash,
          phone: app.phone,
          grade: app.grade,
          department: app.department,
          xp: 0,
          level: 1,
          streak: 0,
        });
      } catch (err) {
        logger.warn({ err, email: app.email }, "could not auto-create user from application");
      }
    }
  }

  res.json({ application: app });
});

export default router;
