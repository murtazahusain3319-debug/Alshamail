const DAY_MS = 24 * 60 * 60 * 1000;

function utcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function calculateLearningStreak(activityDates: readonly Date[], today = new Date()): number {
  const activeDays = new Set(activityDates.map(utcDay));
  const todayDay = utcDay(today);
  let day = activeDays.has(todayDay) ? todayDay : todayDay - DAY_MS;
  if (!activeDays.has(day)) return 0;

  let streak = 0;
  for (; activeDays.has(day); day -= DAY_MS) {
    streak += 1;
  }

  return streak;
}
