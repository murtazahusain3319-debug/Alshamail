import assert from "node:assert/strict";
import test from "node:test";
import { calculateLearningStreak } from "./streak";

test("counts consecutive UTC learning days and ignores duplicate activity", () => {
  const today = new Date("2026-03-10T12:00:00.000Z");
  const streak = calculateLearningStreak(
    [
      new Date("2026-03-10T08:00:00.000Z"),
      new Date("2026-03-10T15:00:00.000Z"),
      new Date("2026-03-09T18:00:00.000Z"),
      new Date("2026-03-08T11:00:00.000Z"),
    ],
    today,
  );

  assert.equal(streak, 3);
});

test("resets the streak when a UTC day is missing", () => {
  const today = new Date("2026-03-10T12:00:00.000Z");
  const streak = calculateLearningStreak(
    [new Date("2026-03-10T08:00:00.000Z"), new Date("2026-03-08T18:00:00.000Z")],
    today,
  );

  assert.equal(streak, 1);
});

test("keeps yesterday's streak active for the current day", () => {
  assert.equal(
    calculateLearningStreak([new Date("2026-03-09T18:00:00.000Z")], new Date("2026-03-10T12:00:00.000Z")),
    1,
  );
});

test("returns zero when the latest learning day is more than one day ago", () => {
  assert.equal(
    calculateLearningStreak([new Date("2026-03-08T18:00:00.000Z")], new Date("2026-03-10T12:00:00.000Z")),
    0,
  );
});
