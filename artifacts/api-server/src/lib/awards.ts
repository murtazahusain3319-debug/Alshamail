import {
  db,
  badgesTable,
  achievementsTable,
  lessonProgressTable,
  lessonsTable,
  quizAttemptsTable,
} from "@workspace/db";
import { eq, lte, and, inArray } from "drizzle-orm";
import { calculateLearningStreak } from "./streak";

export async function getLearningStreak(userId: number): Promise<number> {
  const [lessonActivity, quizActivity] = await Promise.all([
    db
      .select({ activityAt: lessonProgressTable.completedAt })
      .from(lessonProgressTable)
      .where(eq(lessonProgressTable.userId, userId)),
    db
      .select({ activityAt: quizAttemptsTable.takenAt })
      .from(quizAttemptsTable)
      .where(eq(quizAttemptsTable.userId, userId)),
  ]);

  return calculateLearningStreak(
    [...lessonActivity, ...quizActivity].map((activity) => activity.activityAt),
  );
}

export async function awardBadges(
  userId: number,
  nextXp: number,
  courseId: number | null | undefined,
  streak: number,
) {
  const newBadges: (typeof badgesTable.$inferSelect)[] = [];

  const already = await db
    .select({ badgeId: achievementsTable.badgeId })
    .from(achievementsTable)
    .where(eq(achievementsTable.userId, userId));
  const earnedIds = new Set(already.map((r) => r.badgeId));

  const grant = async (badge: typeof badgesTable.$inferSelect) => {
    if (earnedIds.has(badge.id)) return;
    const [inserted] = await db
      .insert(achievementsTable)
      .values({ userId, badgeId: badge.id })
      .onConflictDoNothing()
      .returning({ badgeId: achievementsTable.badgeId });
    if (inserted) {
      earnedIds.add(badge.id);
      newBadges.push(badge);
    }
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

  // Streak badges
  const streakBadges = await db
    .select()
    .from(badgesTable)
    .where(and(eq(badgesTable.criteria, "streak"), lte(badgesTable.threshold, streak)));
  for (const b of streakBadges) await grant(b);

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
