import { db, badgesTable, achievementsTable } from "@workspace/db";
import { eq, lte, and, inArray } from "drizzle-orm";
import { lessonsTable, lessonProgressTable } from "@workspace/db";

export async function awardBadges(userId: number, nextXp: number, courseId?: number | null) {
  const newBadges: any[] = [];

  const already = await db
    .select({ badgeId: achievementsTable.badgeId })
    .from(achievementsTable)
    .where(eq(achievementsTable.userId, userId));
  const earnedIds = new Set(already.map((r) => r.badgeId));

  const grant = async (badge: any) => {
    if (earnedIds.has(badge.id)) return;
    await db.insert(achievementsTable).values({ userId, badgeId: badge.id });
    newBadges.push(badge);
  };

  // XP badges
  const xpBadges = await db
    .select()
    .from(badgesTable)
    .where(and(eq(badgesTable.criteria, "xp"), lte(badgesTable.threshold, nextXp)));
  for (const b of xpBadges) await grant(b);

  // Lesson count badges
  const completedLessons = await db
    .select({ id: lessonProgressTable.id })
    .from(lessonProgressTable)
    .where(eq(lessonProgressTable.userId, userId));
  const lessonBadges = await db
    .select()
    .from(badgesTable)
    .where(and(eq(badgesTable.criteria, "lessons"), lte(badgesTable.threshold, completedLessons.length)));
  for (const b of lessonBadges) await grant(b);

  // Course completion badges
  if (courseId) {
    const courseLessons = await db
      .select({ id: lessonsTable.id })
      .from(lessonsTable)
      .where(eq(lessonsTable.courseId, courseId));

    if (courseLessons.length > 0) {
      const completedInCourse = await db
        .select({ id: lessonProgressTable.id })
        .from(lessonProgressTable)
        .where(and(
          eq(lessonProgressTable.userId, userId),
          inArray(lessonProgressTable.lessonId, courseLessons.map((l) => l.id))
        ));

      if (completedInCourse.length >= courseLessons.length) {
        const courseBadges = await db
          .select()
          .from(badgesTable)
          .where(and(eq(badgesTable.criteria, "course"), eq(badgesTable.threshold, courseId)));
        for (const b of courseBadges) await grant(b);
      }
    }
  }

  return newBadges;
}
