/** Mirrors the level math used on the client. */
export function levelForXp(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
} {
  // Levels: 1 → 0, 2 → 500, 3 → 1100, 4 → 1800, 5 → 2600, 6 → 3500, ...
  let level = 1;
  let needed = 500;
  let cumulative = 0;
  while (xp >= cumulative + needed) {
    cumulative += needed;
    level += 1;
    needed = 500 + (level - 1) * 100;
  }
  return {
    level,
    currentLevelXp: xp - cumulative,
    nextLevelXp: needed,
  };
}
