import type { Question, QuestionCategory } from '@/schema/question';
import type { TestFormat } from '@/schema/region';

/**
 * Full-simulation scoring (build plan §2.3).
 *
 * The real Ontario G1 test is 40 questions — 20 road signs + 20 rules of the
 * road — and you must score **16/20 in each section** to pass. A perfect total
 * with 15 in one section is a fail, so this engine scores per section, using
 * the region's `testFormat` rather than hardcoding any number (province forks
 * inherit the same logic).
 */

export type SectionResult = {
  category: QuestionCategory;
  total: number;
  correct: number;
  passed: boolean;
};

export type SimulationResult = {
  sections: SectionResult[];
  total: number;
  correct: number;
  passed: boolean;
  /** Milliseconds the candidate spent on the full simulation. */
  durationMs: number;
  /** Question ids the learner got wrong — drives the "review your misses" list. */
  misses: string[];
};

export type SimulationAnswer = {
  question: Question;
  selectedIndex: number;
  /** Wall-clock ms when the answer was submitted. */
  answeredAtMs: number;
};

/**
 * Score a full simulation. `testFormat.passPerSection` is the real test's
 * 16/20 bar; `testFormat.split` defines how many questions per section.
 */
export function scoreSimulation(
  testFormat: TestFormat,
  answers: SimulationAnswer[],
  startedAtMs: number,
): SimulationResult {
  const sectionKeys = Object.keys(testFormat.split) as QuestionCategory[];

  const sections: SectionResult[] = sectionKeys.map((category) => {
    const inSection = answers
      .filter((answer) => answer.question.category === category)
      .slice(0, testFormat.split[category]);

    const correct = inSection.filter(
      (answer) => answer.selectedIndex === answer.question.correctIndex,
    ).length;

    return {
      category,
      total: inSection.length,
      correct,
      passed: correct >= testFormat.passPerSection,
    };
  });

  const misses = answers
    .filter((answer) => answer.selectedIndex !== answer.question.correctIndex)
    .map((answer) => answer.question.id);

  const lastAnswer = answers[answers.length - 1];
  const durationMs = lastAnswer ? lastAnswer.answeredAtMs - startedAtMs : 0;

  return {
    sections,
    total: sections.reduce((sum, section) => sum + section.total, 0),
    correct: sections.reduce((sum, section) => sum + section.correct, 0),
    passed: sections.every((section) => section.passed),
    durationMs,
    misses,
  };
}

/** Convenience: a single section (used by the practice session result). */
export function scorePracticeSession(answers: SimulationAnswer[]): SectionResult | null {
  if (answers.length === 0) return null;
  const category = answers[0].question.category;
  const total = answers.length;
  const correct = answers.filter((answer) => answer.selectedIndex === answer.question.correctIndex).length;
  return { category, total, correct, passed: false };
}