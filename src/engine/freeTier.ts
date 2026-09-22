import type { FreeTier } from '@/schema/region';

/**
 * Free-tier limits (build plan §2, §3.3).
 *
 * The cap is per *local calendar day*, matching how a learner thinks about
 * "today", and is deliberately pure: the screens own the SQLite read/write and
 * these functions own the arithmetic, so the rules are unit-testable without a
 * database or a RevenueCat sandbox.
 */

/** Local yyyy-mm-dd key, same convention as the streak in `useAppStore`. */
export function dailyKey(now: number = Date.now()): string {
  const date = new Date(now);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Settings key holding today's practice-question count. */
export function practiceUsageKey(now: number = Date.now()): string {
  return `practiceUsage:${dailyKey(now)}`;
}

/** Settings key holding today's simulation count. */
export function simulationUsageKey(now: number = Date.now()): string {
  return `simulationUsage:${dailyKey(now)}`;
}

/** Parse a stored counter, tolerating null/garbage. */
export function parseUsage(raw: string | null | undefined): number {
  const value = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** How many more practice questions the free tier allows today. */
export function remainingPractice(used: number, freeTier: FreeTier): number {
  return Math.max(0, freeTier.practicePerDay - used);
}

/** How many more full simulations the free tier allows today. */
export function remainingSimulations(used: number, freeTier: FreeTier): number {
  return Math.max(0, freeTier.simulationsPerDay - used);
}

/**
 * The largest offered practice length the learner can still start today.
 * Returns 0 when the daily cap is used up.
 */
export function allowedPracticeLength(
  used: number,
  freeTier: FreeTier,
  lengths: readonly number[],
): number {
  const remaining = remainingPractice(used, freeTier);
  return lengths
    .filter((length) => length <= remaining)
    .reduce((best, length) => Math.max(best, length), 0);
}
