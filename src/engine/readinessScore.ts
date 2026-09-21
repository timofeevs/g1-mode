import type { SimulationResult } from '@/engine/session';

/**
 * Readiness score — the home-screen "readiness ring" (build plan §2.5).
 *
 * A 0–100 number synthesised from recent session history. The most recent
 * session is weighted most heavily (linear decay), so one great simulation
 * visibly moves the ring while a stale streak of old fails slowly fades.
 *
 * History order convention: **most recent first** — the same order
 * `getRecentSessions` returns, and the same order the screens feed in.
 *
 * Readiness is shown as a ring with a band label:
 *  - `low`      (score < 65)  — not test-ready yet
 *  - `building` (65–79)       — getting there
 *  - `ready`    (>= 80)       — book that G1
 */

export type ReadinessBand = 'low' | 'building' | 'ready';

/** Only the most recent sessions influence the score. */
const MAX_HISTORY = 6;

type ScoreableResult = Pick<SimulationResult, 'passed' | 'correct' | 'total'>;

/** One session's contribution: a pass is 100, a fail scales with % correct. */
function sessionScore(result: ScoreableResult): number {
  if (result.total <= 0) return 0;
  if (result.passed) return 100;
  return (result.correct / result.total) * 100;
}

/**
 * Weighted readiness over recent history. `history[0]` is the most recent
 * session and gets the largest weight. Returns 0 when there is no history.
 */
export function readinessScore(history: ScoreableResult[]): number {
  const recent = history.slice(0, MAX_HISTORY);
  if (recent.length === 0) return 0;

  let weighted = 0;
  let totalWeight = 0;
  for (let i = 0; i < recent.length; i += 1) {
    const weight = recent.length - i;
    weighted += sessionScore(recent[i]) * weight;
    totalWeight += weight;
  }
  return totalWeight === 0 ? 0 : Math.round(weighted / totalWeight);
}

/** Map a readiness score to its band. */
export function bandForScore(score: number): ReadinessBand {
  if (score < 65) return 'low';
  if (score < 80) return 'building';
  return 'ready';
}

/** Short coaching copy for a band (home screen / result screen). */
export function readinessCopy(band: ReadinessBand): string {
  switch (band) {
    case 'low':
      return 'Keep going — a few focused practice rounds and you will be test-ready.';
    case 'building':
      return 'Solid progress. Nail your weak sections and you are close.';
    case 'ready':
      return 'You are ready. Book that G1 with confidence.';
  }
}