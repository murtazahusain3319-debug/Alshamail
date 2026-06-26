import { Router, type IRouter } from "express";
import { asc, eq, and } from "drizzle-orm";
import { db, badgesTable, achievementsTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

router.get("/badges", async (_req, res): Promise<void> => {
  const items = await db.select().from(badgesTable).orderBy(asc(badgesTable.id));
  res.json({ items });
});

router.post("/badges", requireAdmin, async (req, res): Promise<void> => {
  const d = req.body ?? {};
  if (!d.name) {
    res.status(400).json({ error: "Name is required." });
    return;
  }
  const [b] = await db
    .insert(badgesTable)
    .values({
      name: String(d.name),
      description: d.description ?? "",
      icon: d.icon ?? "🏅",
      imageUrl: typeof d.imageUrl === "string" && d.imageUrl.trim() ? d.imageUrl.trim() : null,
      color: d.color ?? "#C9A84C",
      criteria: ["manual", "xp", "lessons", "streak"].includes(String(d.criteria)) ? d.criteria : "manual",
      threshold: typeof d.threshold === "number" ? d.threshold : null,
    })
    .returning();
  res.status(201).json(b);
});

router.delete("/badges/:userId/:badgeId", requireAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.userId, 10);
  const badgeId = parseInt(req.params.badgeId, 10);
  if (isNaN(userId) || isNaN(badgeId)) {
    res.status(400).json({ error: "Invalid user ID or badge ID." });
    return;
  }
  await db
    .delete(achievementsTable)
    .where(and(eq(achievementsTable.userId, userId), eq(achievementsTable.badgeId, badgeId)));
  res.status(204).send();
});

export default router;
