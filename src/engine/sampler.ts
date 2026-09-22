import type { Question, QuestionCategory } from '@/schema/question';
import type { TestFormat } from '@/schema/region';

/**
 * Question sampling (build plan §2.2, §2.3).
 *
 * Screens never pick questions themselves — they ask this module, so the
 * "40 questions split 20/20" rule and the option shuffle live in one place and
 * a province fork only changes `testFormat`.
 *
 * Everything is pure and takes an injectable RNG, so tests can assert on
 * exact selections instead of hoping a shuffle was kind.
 */

export type Rng = () => number;

/** Fisher-Yates. Returns a new array; the input is never mutated. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const swap = out[i];
    out[i] = out[j];
    out[j] = swap;
  }
  return out;
}

/**
 * Re-order a question's options and remap `correctIndex` to follow.
 *
 * Without this, a learner could memorise "the answer is always C" instead of
 * the rule being tested. `options` is a 4-tuple, so the result is cast back.
 */
export function withShuffledOptions(question: Question, rng: Rng = Math.random): Question {
  const order = shuffle(
    question.options.map((_, index) => index),
    rng,
  );
  return {
    ...question,
    options: order.map((index) => question.options[index]) as Question['options'],
    correctIndex: order.indexOf(question.correctIndex),
  };
}

export type SampleOptions = {
  /** Restrict to one scored section. */
  category?: QuestionCategory;
  /** Restrict to the curated free set (free-tier practice). */
  freeOnly?: boolean;
  rng?: Rng;
};

/**
 * Pick `length` questions, shuffled, with shuffled options.
 *
 * Returns fewer than `length` when the pool is too small — callers surface that
 * rather than the sampler silently repeating questions.
 */
export function sampleQuestions(
  pool: readonly Question[],
  length: number,
  options: SampleOptions = {},
): Question[] {
  const { category, freeOnly, rng = Math.random } = options;

  const candidates = pool.filter((question) => {
    if (category && question.category !== category) return false;
    if (freeOnly && !question.isFree) return false;
    return true;
  });

  return shuffle(candidates, rng)
    .slice(0, length)
    .map((question) => withShuffledOptions(question, rng));
}

/**
 * Build a full simulation: exactly `testFormat.split` questions per section,
 * shuffled together so signs and rules are interleaved the way a real sitting
 * feels. Never free-tier filtered — one full simulation is free by design.
 */
export function buildSimulation(
  pool: readonly Question[],
  testFormat: TestFormat,
  options: { rng?: Rng } = {},
): Question[] {
  const rng = options.rng ?? Math.random;
  const sections = Object.keys(testFormat.split) as QuestionCategory[];

  const parts = sections.map((category) =>
    sampleQuestions(pool, testFormat.split[category], { category, rng }),
  );

  return shuffle(
    parts.flat().map((question) => withShuffledOptions(question, rng)),
    rng,
  );
}

/** Every scored section in the region's format, for filter chips and reports. */
export function sectionsOf(testFormat: TestFormat): QuestionCategory[] {
  return Object.keys(testFormat.split) as QuestionCategory[];
}
