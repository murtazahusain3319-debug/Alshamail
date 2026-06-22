import { Router, type IRouter } from "express";
import { asc } from "drizzle-orm";
import { db, badgesTable } from "@workspace/db";
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
      color: d.color ?? "#C9A84C",
      criteria: ["manual", "xp", "lessons", "streak"].includes(String(d.criteria)) ? d.criteria : "manual",
      threshold: typeof d.threshold === "number" ? d.threshold : null,
    })
    .returning();
  res.status(201).json(b);
});

export default router;
