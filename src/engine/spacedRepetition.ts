/**
 * SM-2 spaced repetition — the scheduling engine behind the Review queue
 * (build plan §1.3).
 *
 * This is deliberately dependency-free and pure so it can be unit-tested in
 * isolation and shared verbatim by the Review screen and any future province
 * fork. All scheduling happens in *days*; callers convert to absolute due
 * timestamps via `dueDateFromInterval`.
 *
 * Grades map to the four Review buttons on a card:
 *  - `again`  — didn't remember it (resets the card, shortest interval)
 *  - `hard`   — remembered but with effort (interval barely grows)
 *  - `good`   — remembered (classic SM-2 growth)
 *  - `easy`   — trivially remembered (interval grows fastest, ease +)
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Default ease factor, from the original SM-2 paper. */
export const DEFAULT_EASE = 2.5;

/** Bounds that keep the scheduler stable for thousands of reviews. */
export const MIN_EASE = 1.3;
export const MAX_EASE = 3.5;

export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';

/** Persisted scheduling state for one question. */
export interface CardState {
  questionId: string;
  /** Ease factor (multiplier); grows on success, shrinks on failure. */
  ease: number;
  /** Current interval in days. */
  interval: number;
  /** Consecutive successful reviews (SM-2's "repetitions"). */
  repetitions: number;
  /** Absolute due timestamp (ms since epoch). Due when <= now. */
  dueDate: number;
  /** Total number of times the card was reset to `again`. */
  lapses: number;
}

/** A brand-new card is due immediately. */
export function createCard(questionId: string, now: number = Date.now()): CardState {
  return {
    questionId,
    ease: DEFAULT_EASE,
    interval: 0,
    repetitions: 0,
    dueDate: now,
    lapses: 0,
  };
}

/** A card is due if its due timestamp has passed (or is now). */
export function isDue(card: CardState, now: number = Date.now()): boolean {
  return card.dueDate <= now;
}

/** Number of days until a card is due (0 if already due). */
export function daysUntilDue(card: CardState, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((card.dueDate - now) / DAY_MS));
}

function clampEase(ease: number): number {
  return Math.min(MAX_EASE, Math.max(MIN_EASE, ease));
}

function nextIntervalFor(repetitions: number, interval: number, ease: number): number {
  // SM-2: the first successful review is 1 day, the second 6, then geometric.
  if (repetitions <= 1) return 1;
  if (repetitions === 2) return 6;
  return Math.round(interval * ease);
}

/**
 * Apply a grade to a card and return the updated card.
 *
 * Returns a *new* object; the caller decides whether to persist it. `now` is
 * injectable for deterministic tests.
 */
export function gradeCard(
  card: CardState,
  grade: ReviewGrade,
  now: number = Date.now(),
): CardState {
  let ease = card.ease;
  let interval = card.interval;
  let repetitions = card.repetitions;
  let lapses = card.lapses;

  switch (grade) {
    case 'again':
      // Failure: reset repetition count, shortest interval, ease decays.
      repetitions = 0;
      interval = 1;
      ease -= 0.2;
      lapses += 1;
      break;
    case 'hard':
      // Correct but effortful: interval barely grows, ease decays a touch.
      repetitions += 1;
      interval = repetitions <= 1 ? 1 : Math.max(1, Math.round(interval * 1.2));
      ease -= 0.15;
      break;
    case 'good':
      repetitions += 1;
      interval = nextIntervalFor(repetitions, interval, ease);
      break;
    case 'easy':
      // Trivially remembered: fastest growth, ease increases.
      repetitions += 1;
      interval = Math.round(nextIntervalFor(repetitions, interval, ease) * 1.3);
      ease += 0.15;
      break;
  }

  return {
    ...card,
    ease: clampEase(ease),
    interval,
    repetitions,
    dueDate: now + interval * DAY_MS,
    lapses,
  };
}

/** True if the card has ever been answered correctly at least once. */
export function isMature(card: CardState): boolean {
  return card.repetitions > 0 && card.interval >= 21;
}
