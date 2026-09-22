import { readinessScore } from '@/engine/readinessScore';

/**
 * History helpers (build plan §2.5).
 *
 * `readinessScore` needs a `{ passed, correct, total }` triple, but the stored
 * session row keeps only the number correct plus the ids that were missed —
 * a row is written for *every* answered question, so `correct + misses` is
 * exactly how many were answered. Deriving the total here (instead of storing
 * it) means the sessions table needs no extra column and old rows keep working.
 *
 * Kept pure and free of storage imports so it stays unit-testable.
 */

/** The subset of a stored session this module needs. */
export type SessionLike = {
  scored: number;
  passed: boolean;
  misses: string[];
};

/** Questions answered in a session. */
export function answeredCount(session: SessionLike): number {
  return session.scored + session.misses.length;
}

/** Percentage correct, or 0 for an empty session. */
export function accuracy(session: SessionLike): number {
  const total = answeredCount(session);
  return total === 0 ? 0 : Math.round((session.scored / total) * 100);
}

/**
 * Readiness across a most-recent-first history. Sessions with no answers are
 * dropped rather than dragging the score down.
 */
export function readinessFromHistory(sessions: readonly SessionLike[]): number {
  const scoreable = sessions
    .map((session) => ({
      passed: session.passed,
      correct: session.scored,
      total: answeredCount(session),
    }))
    .filter((session) => session.total > 0);

  return readinessScore(scoreable);
}

/** Total questions answered across every session in the history. */
export function totalAnswered(sessions: readonly SessionLike[]): number {
  return sessions.reduce((sum, session) => sum + answeredCount(session), 0);
}
