import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, scheduleEventsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/schedule", async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(scheduleEventsTable)
    .orderBy(asc(scheduleEventsTable.startsAt));
  res.json({ items });
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
      link: d.link ?? null,
      notes: d.notes ?? null,
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
