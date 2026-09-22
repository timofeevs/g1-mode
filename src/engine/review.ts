import type { CardState } from '@/engine/spacedRepetition';
import type { Question } from '@/schema/question';

/**
 * Review queue (build plan §1.3, §2.2).
 *
 * Turns the SM-2 card table into the list of questions the learner should see
 * today. Kept pure and separate from `useQuizSession` so the ordering rules —
 * most overdue first, never-seen questions excluded — are unit-testable without
 * a database, and so the Review screen never touches raw SQL rows.
 *
 * A question with no card has never been answered, so it is not a *review* item;
 * it enters the queue the first time the learner meets it in practice.
 */

/** Cap on one review round; a queue of 400 cards is not a sitting. */
export const MAX_REVIEW_QUESTIONS = 20;

/** Cards that are due, most overdue first. */
export function dueCards(cards: readonly CardState[], now: number = Date.now()): CardState[] {
  return cards
    .filter((card) => card.dueDate <= now)
    .sort((a, b) => a.dueDate - b.dueDate);
}

/**
 * The questions to review, in due order. `cards` may be in any order; questions
 * that are no longer in the bank (retired content) are skipped rather than
 * rendered as a blank card.
 */
export function buildReviewQueue(
  questions: readonly Question[],
  cards: readonly CardState[],
  options: { limit?: number; now?: number } = {},
): Question[] {
  const { limit = MAX_REVIEW_QUESTIONS, now = Date.now() } = options;

  const byId = new Map(questions.map((question) => [question.id, question]));

  return dueCards(cards, now)
    .map((card) => byId.get(card.questionId))
    .filter((question): question is Question => question !== undefined)
    .slice(0, limit);
}

/** How many cards are waiting right now (for the Review tab badge). */
export function dueCount(cards: readonly CardState[], now: number = Date.now()): number {
  return cards.filter((card) => card.dueDate <= now).length;
}

/** Human copy for the Review screen's empty state. */
export function nextDueCopy(cards: readonly CardState[], now: number = Date.now()): string {
  if (cards.length === 0) {
    return 'Nothing scheduled yet. Answer practice questions and the ones you miss come back here.';
  }
  const soonest = cards.reduce(
    (best, card) => (card.dueDate < best ? card.dueDate : best),
    Number.POSITIVE_INFINITY,
  );
  if (!Number.isFinite(soonest)) return 'Nothing due right now.';
  const days = Math.max(1, Math.ceil((soonest - now) / (24 * 60 * 60 * 1000)));
  return `Nothing due right now — your next card comes back in ${days} ${days === 1 ? 'day' : 'days'}.`;
}
