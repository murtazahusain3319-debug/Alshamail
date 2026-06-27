import { Router, type IRouter, type Request } from "express";
import { eq, and, asc, sql, inArray, lte } from "drizzle-orm";
import multer, { type MulterError } from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  db,
  lessonsTable,
  coursesTable,
  lessonProgressTable,
  quizzesTable,
  quizAttemptsTable,
  usersTable,
  xpEventsTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { levelForXp } from "../lib/level";
import { awardBadges } from "../lib/awards";

const router: IRouter = Router();

// Setup multer for video uploads
const uploadsDir = path.resolve(process.cwd(), "../uploads/videos");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, uploadsDir);
  },
  filename: (_req: any, file: any, cb: any) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const videoUpload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
  fileFilter: (_req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"));
    }
  },
});

router.post("/lessons/upload-video", requireAuth, videoUpload.single("video"), async (req: Request & { file?: Express.Multer.File }, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No video file provided." });
    return;
  }

  const videoUrl = `/uploads/videos/${req.file.filename}`;
  res.json({ videoUrl });
});

router.get("/lessons/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const [l] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, id)).limit(1);
  if (!l) {
    res.json(null);
    return;
  }
  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, l.courseId)).limit(1);
  const siblings = await db
    .select()
    .from(lessonsTable)
    .where(eq(lessonsTable.courseId, l.courseId))
    .orderBy(asc(lessonsTable.order));
  const idx = siblings.findIndex((x) => x.id === l.id);
  const nextVideo = siblings.slice(idx + 1).find((x) => x.kind === "video") ?? null;
  const prevVideo = siblings
    .slice(0, idx)
    .reverse()
    .find((x) => x.kind === "video") ?? null;

  let completed = false;
  if (req.user) {
    const c = await db
      .select({ id: lessonProgressTable.id })
      .from(lessonProgressTable)
      .where(and(eq(lessonProgressTable.userId, req.user.id), eq(lessonProgressTable.lessonId, l.id)))
      .limit(1);
    completed = c.length > 0;
  }
  const hasQuiz =
    l.kind === "quiz" ||
    (await db.select({ id: quizzesTable.id }).from(quizzesTable).where(eq(quizzesTable.lessonId, l.id)).limit(1)).length > 0;

  res.json({
    ...l,
    durationMinutes: l.durationMin,
    xpReward: l.xpReward ?? 50,
    description: l.description ?? "",
    course: course ?? null,
    completed,
    hasQuiz,
    prev: idx > 0 ? siblings[idx - 1] : null,
    next: idx < siblings.length - 1 ? siblings[idx + 1] : null,
    prevVideo,
    nextVideo,
  });
});

router.post("/courses/:id/lessons", requireAuth, async (req, res): Promise<void> => {
  const courseId = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(courseId)) {
    res.status(400).json({ error: "Invalid course id." });
    return;
  }
  const d = req.body ?? {};
  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${lessonsTable.order}), 0)::int` })
    .from(lessonsTable)
    .where(eq(lessonsTable.courseId, courseId));
  const [l] = await db
    .insert(lessonsTable)
    .values({
      courseId,
      title: d.title ?? "Untitled lesson",
      kind: d.kind === "video" || d.kind === "reading" || d.kind === "quiz" ? d.kind : "reading",
      durationMin: Number.isFinite(Number(d.durationMin)) ? Number(d.durationMin) : 10,
      xpReward: Number.isFinite(Number(d.xpReward)) ? Number(d.xpReward) : 50,
      videoUrl: d.kind === "video" ? d.videoUrl ?? null : null,
      content: d.kind === "reading" ? d.content ?? null : null,
      description: d.description ?? "",
      order: maxOrder + 1,
    })
    .returning();
  res.status(201).json({ ...l, durationMinutes: l.durationMin, xpReward: l.xpReward ?? 50 });
});

router.delete("/lessons/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const [removed] = await db.delete(lessonsTable).where(eq(lessonsTable.id, id)).returning();
  if (!removed) {
    res.status(404).json({ error: "Lesson not found." });
    return;
  }
  res.json({ ok: true });
});

router.patch("/lessons/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const d = req.body ?? {};
  const [updated] = await db
    .update(lessonsTable)
    .set({
      title: d.title ?? undefined,
      kind: d.kind === "video" || d.kind === "reading" || d.kind === "quiz" ? d.kind : undefined,
      durationMin: Number.isFinite(Number(d.durationMin)) ? Number(d.durationMin) : 10,
      xpReward: Number.isFinite(Number(d.xpReward)) ? Number(d.xpReward) : undefined,
      videoUrl: d.kind === "video" ? (d.videoUrl ?? null) : null,
      content: d.kind === "reading" ? (d.content ?? null) : null,
      mcqQuestions: Array.isArray(d.mcqQuestions) ? JSON.stringify(d.mcqQuestions) : undefined,
      description: typeof d.description === "string" ? d.description : undefined,
    })
    .where(eq(lessonsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Lesson not found." });
    return;
  }
  res.json({ ...updated, durationMinutes: updated.durationMin, xpReward: updated.xpReward ?? 50 });
});

router.put("/lessons/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const d = req.body ?? {};
  const [updated] = await db
    .update(lessonsTable)
    .set({
      title: d.title ?? undefined,
      kind: d.kind === "video" || d.kind === "reading" || d.kind === "quiz" ? d.kind : undefined,
      durationMin: Number.isFinite(Number(d.durationMin)) ? Number(d.durationMin) : undefined,
      xpReward: Number.isFinite(Number(d.xpReward)) ? Number(d.xpReward) : undefined,
      videoUrl: d.kind === "video" ? (d.videoUrl ?? null) : d.kind === "reading" ? null : null,
      content: d.kind === "reading" ? (d.content ?? null) : null,
      mcqQuestions: Array.isArray(d.mcqQuestions) ? JSON.stringify(d.mcqQuestions) : undefined,
      description: typeof d.description === "string" ? d.description : undefined,
    })
    .where(eq(lessonsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Lesson not found." });
    return;
  }
  res.json({ ...updated, durationMinutes: updated.durationMin, xpReward: updated.xpReward ?? 50 });
});

router.post("/lessons/:id/complete", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const u = req.user!;
  const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, id)).limit(1);
  if (!lesson) {
    res.status(404).json({ error: "Lesson not found." });
    return;
  }
  const existing = await db
    .select({ id: lessonProgressTable.id })
    .from(lessonProgressTable)
    .where(and(eq(lessonProgressTable.userId, u.id), eq(lessonProgressTable.lessonId, id)))
    .limit(1);
  let xpAwarded = 0;
  let leveledUp = false;
  let newLevel = u.level;
  let newBadges: any[] = [];
  if (existing.length === 0) {
    await db.insert(lessonProgressTable).values({ userId: u.id, lessonId: id });
    xpAwarded = lesson.xpReward ?? 50;
    const nextXp = u.xp + xpAwarded;
    const lvl = levelForXp(nextXp);
    leveledUp = lvl.level > u.level;
    newLevel = lvl.level;
    await db
      .update(usersTable)
      .set({ xp: nextXp, level: lvl.level, lastActiveAt: new Date() })
      .where(eq(usersTable.id, u.id));
    await db.insert(xpEventsTable).values({ userId: u.id, amount: xpAwarded, reason: "Lesson complete" });

    // Award badges using the reusable utility
    newBadges = await awardBadges(u.id, nextXp, lesson.courseId).catch(() => []);
  }
  res.json({ lessonId: id, xpAwarded, leveledUp, level: newLevel, newBadges });
});

router.get("/lessons/:id/quiz", async (req, res): Promise<void> => {
  const lessonId = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(lessonId)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }

  const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId)).limit(1);
  if (!lesson) {
    res.json(null);
    return;
  }

  let rawQuestions = lesson.mcqQuestions;
  if (!rawQuestions || rawQuestions.trim() === "[]") {
    const [qRow] = await db.select({ questions: quizzesTable.questions }).from(quizzesTable).where(eq(quizzesTable.lessonId, lessonId)).limit(1);
    rawQuestions = qRow?.questions ?? "[]";
  }

  let questions: Array<any> = [];
  try {
    const parsed = JSON.parse(rawQuestions);
    if (Array.isArray(parsed)) {
      questions = parsed.map((qq: any) => ({
        id: qq.id,
        prompt: qq.text ?? qq.prompt ?? "",
        text: qq.text ?? qq.prompt ?? "",
        choices: Array.isArray(qq.options) ? qq.options : Array.isArray(qq.choices) ? qq.choices : [],
        explanation: qq.explanation ?? "",
        image: qq.image ?? null,
        correctIndex: Number.isFinite(Number(qq.correctIndex)) ? Number(qq.correctIndex) : Number.isFinite(Number(qq.correct)) ? Number(qq.correct) : 0,
      }));
    }
  } catch {
    /* ignore */
  }

  res.json({
    id: lessonId,
    lessonId,
    title: `${lesson?.title ?? "Lesson"} — Quiz`,
    xpReward: lesson.xpReward ?? 20,
    questions,
  });
});

router.post("/lessons/:id/quiz/submit", requireAuth, async (req, res): Promise<void> => {
  const lessonId = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(lessonId)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }

  const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId)).limit(1);
  if (!lesson) {
    res.status(404).json({ error: "Lesson not found." });
    return;
  }

  let rawQuestions = lesson.mcqQuestions;
  if (!rawQuestions || rawQuestions.trim() === "[]") {
    const [qRow] = await db.select({ questions: quizzesTable.questions }).from(quizzesTable).where(eq(quizzesTable.lessonId, lessonId)).limit(1);
    rawQuestions = qRow?.questions ?? "[]";
  }

  let questions: Array<any> = [];
  try {
    const parsed = JSON.parse(rawQuestions);
    if (Array.isArray(parsed)) questions = parsed;
  } catch {
    questions = [];
  }
  const total = questions.length;
  if (total === 0) {
    res.json({ score: 0, percentage: 0, correct: 0, total: 0, detail: [], correctness: [], xpAwarded: 0, leveledUp: false, level: lesson.xpReward ?? 0, passed: false });
    return;
  }

  const rawAns = req.body?.answers;
  const answersByQ: Record<number, number> = {};
  if (Array.isArray(rawAns)) {
    for (const a of rawAns) answersByQ[a.questionId] = a.choiceIndex;
  } else if (rawAns && typeof rawAns === "object") {
    for (const [k, v] of Object.entries(rawAns)) answersByQ[Number(k)] = v as number;
  }

  let correct = 0;
  const detail = questions.map((qq: any) => {
    const correctIndex = Number.isFinite(Number(qq.correctIndex)) ? Number(qq.correctIndex) : Number.isFinite(Number(qq.correct)) ? Number(qq.correct) : 0;
    const ans = answersByQ[qq.id];
    const ok = ans === correctIndex;
    if (ok) correct += 1;
    return { questionId: qq.id, correct: ok, correctIndex, chose: ans };
  });
  const score = Math.round((correct / total) * 100);

  await db.insert(quizAttemptsTable).values({ userId: req.user!.id, lessonId, score });
  const xpAwarded = Math.round(score / 5);
  const nextXp = req.user!.xp + xpAwarded;
  const lvl = levelForXp(nextXp);
  const leveledUp = lvl.level > req.user!.level;
  await db
    .update(usersTable)
    .set({ xp: nextXp, level: lvl.level, lastActiveAt: new Date() })
    .where(eq(usersTable.id, req.user!.id));
  if (xpAwarded > 0) {
    await db.insert(xpEventsTable).values({ userId: req.user!.id, amount: xpAwarded, reason: "Quiz complete" });
  }

  if (score >= 60) {
    const existingProgress = await db
      .select({ id: lessonProgressTable.id })
      .from(lessonProgressTable)
      .where(and(eq(lessonProgressTable.userId, req.user!.id), eq(lessonProgressTable.lessonId, lessonId)))
      .limit(1);
    if (existingProgress.length === 0) {
      await db.insert(lessonProgressTable).values({ userId: req.user!.id, lessonId });
    }
  }

  // Award badges using the reusable utility
  const newBadges = await awardBadges(req.user!.id, nextXp, lesson.courseId).catch(() => []);

  res.json({
    score,
    percentage: score,
    correct,
    total,
    detail,
    correctness: detail,
    xpAwarded,
    leveledUp,
    level: lvl.level,
    passed: score >= 60,
    newBadges,
  });
});

export default router;
