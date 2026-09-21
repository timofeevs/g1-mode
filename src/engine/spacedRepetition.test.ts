import {
  createCard,
  DAY_MS,
  DEFAULT_EASE,
  gradeCard,
  isDue,
  isMature,
  MAX_EASE,
  MIN_EASE,
  type CardState,
} from '@/engine/spacedRepetition';

/** Fixed "now" so interval math is deterministic across test runs. */
const NOW = 1_000_000_000_000;

describe('createCard', () => {
  it('starts new cards due immediately at the default ease', () => {
    const card = createCard('q1', NOW);
    expect(card.questionId).toBe('q1');
    expect(card.ease).toBe(DEFAULT_EASE);
    expect(card.interval).toBe(0);
    expect(card.repetitions).toBe(0);
    expect(card.lapses).toBe(0);
    expect(isDue(card, NOW)).toBe(true);
  });
});

describe('gradeCard — SM-2 scheduling', () => {
  it('schedules the canonical 1, 6, then geometric intervals on good grades', () => {
    let card = createCard('q1', NOW);
    card = gradeCard(card, 'good', NOW);
    expect(card.interval).toBe(1);
    card = gradeCard(card, 'good', NOW + 1 * DAY_MS);
    expect(card.interval).toBe(6);
    card = gradeCard(card, 'good', NOW + 7 * DAY_MS);
    expect(card.interval).toBe(Math.round(6 * DEFAULT_EASE)); // 15
  });

  it('keeps ease constant across good reviews and grows it on easy', () => {
    let card = createCard('q1', NOW);
    const afterGood = gradeCard(card, 'good', NOW);
    expect(afterGood.ease).toBeCloseTo(DEFAULT_EASE, 5);
    const afterEasy = gradeCard(afterGood, 'easy', NOW);
    expect(afterEasy.ease).toBeCloseTo(DEFAULT_EASE + 0.15, 5);
  });

  it('resets to a 1-day interval and decays ease on again (a lapse)', () => {
    let card = createCard('q1', NOW);
    card = gradeCard(card, 'good', NOW);
    card = gradeCard(card, 'good', NOW + 1 * DAY_MS);
    const before = card.interval;
    expect(before).toBeGreaterThan(1);

    const lapsed = gradeCard(card, 'again', NOW + 7 * DAY_MS);
    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.interval).toBe(1);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.ease).toBeLessThan(card.ease);
  });

  it('clamps ease to the documented bounds', () => {
    let card = createCard('q1', NOW);
    for (let i = 0; i < 40; i++) {
      card = gradeCard(card, 'again', NOW);
    }
    expect(card.ease).toBeGreaterThanOrEqual(MIN_EASE);

    card = createCard('q2', NOW);
    for (let i = 0; i < 40; i++) {
      card = gradeCard(card, 'easy', NOW);
    }
    expect(card.ease).toBeLessThanOrEqual(MAX_EASE);
  });

  it('marks long-interval, repeated cards as mature', () => {
    let card = createCard('q1', NOW);
    for (let i = 0; i < 10; i++) {
      card = gradeCard(card, 'good', NOW);
    }
    expect(isMature(card)).toBe(true);
    expect(isMature(createCard('q2', NOW))).toBe(false);
  });

  it('returns a new object and leaves the input untouched', () => {
    const card = createCard('q1', NOW);
    const next = gradeCard(card, 'good', NOW);
    expect(next).not.toBe(card);
    expect(card.interval).toBe(0);
  });
});
