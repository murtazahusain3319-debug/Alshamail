import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, desc } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, applicationsTable, usersTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const cvUploadsDir = path.resolve(process.cwd(), "../uploads/cvs");
if (!fs.existsSync(cvUploadsDir)) {
  fs.mkdirSync(cvUploadsDir, { recursive: true });
}

const cvUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, cvUploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".pdf";
      cb(null, `cv-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC, and DOCX files are allowed"));
    }
  },
});

router.get("/applications", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(applicationsTable)
    .orderBy(desc(applicationsTable.createdAt));
  res.json({ applications: rows });
});

router.post("/applications", cvUpload.single("cvFile"), async (req, res): Promise<void> => {
  let d = req.body?.data ?? req.body ?? {};
  if (typeof d === "string") {
    try {
      d = JSON.parse(d);
    } catch {
      d = {};
    }
  }
  const firstName = String(d.firstName ?? "").trim();
  const lastName = String(d.lastName ?? "").trim();
  const email = String(d.email ?? "").trim().toLowerCase();
  const password = String(d.password ?? "").trim();
  if (!firstName || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required." });
    return;
  }
  const role = d.role === "teacher" ? "teacher" : "student";
  const passwordHash = await bcrypt.hash(password, 10);
  
  let cvUrl: string | null = null;
  if (req.file) {
    cvUrl = `/uploads/cvs/${req.file.filename}`;
  }
  
  const [app] = await db
    .insert(applicationsTable)
    .values({
      firstName,
      lastName: lastName || null,
      email,
      passwordHash,
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
      cvUrl,
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
      // Use the password hash from the application, or fall back to temp password if not available
      const passwordHash = app.passwordHash || await bcrypt.hash(app.role === "teacher" ? "teacher123" : "student123", 10);
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
