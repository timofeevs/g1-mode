import { useCallback, useMemo, useState } from 'react';

import {
  scorePracticeSession,
  scoreSimulation,
  type SectionResult,
  type SimulationAnswer,
  type SimulationResult,
} from '@/engine/session';
import { createCard, gradeCard, type ReviewGrade } from '@/engine/spacedRepetition';
import * as haptics from '@/lib/haptics';
import type { Question } from '@/schema/question';
import type { TestFormat } from '@/schema/region';

/**
 * The quiz state machine shared by Practice and Simulation (build plan §2.2,
 * §2.3).
 *
 * Both modes walk the same list of questions; they differ in one behavioural
 * flag — practice reveals the explanation after each answer, a simulation does
 * not (the real G1 test gives no feedback until the end).
 *
 * Answering also feeds the SM-2 scheduler: every graded question upserts a card
 * so the Review queue has something to work with.
 */

/** Lazy storage access, matching the deferred-require pattern in the stores. */
function storageModule() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@/services/storage') as typeof import('@/services/storage');
}

export type QuizMode = 'practice' | 'simulation';

export type QuizOutcome =
  | {
      kind: 'practice';
      section: SectionResult | null;
      correct: number;
      total: number;
      durationMs: number;
      misses: string[];
    }
  | { kind: 'simulation'; result: SimulationResult };

export type QuizSession = {
  current: Question | undefined;
  /** 1-based position for display ("Question 3 of 40"). */
  position: number;
  total: number;
  /** The answer the learner tapped for the current question, if any. */
  selectedIndex: number | null;
  /** Practice only: true once the answer is locked in and explained. */
  revealed: boolean;
  /** Practice only: whether the revealed answer was right. */
  isCorrect: boolean | null;
  correctCount: number;
  finished: boolean;
  outcome: QuizOutcome | null;
  select: (optionIndex: number) => void;
  next: () => void;
  quit: () => QuizOutcome;
};

/** Grades are binary for now: recalled, or not. A future UI can add hard/easy. */
function gradeFor(correct: boolean): ReviewGrade {
  return correct ? 'good' : 'again';
}

export function useQuizSession(
  questions: readonly Question[],
  mode: QuizMode,
  testFormat: TestFormat,
): QuizSession {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<SimulationAnswer[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [outcome, setOutcome] = useState<QuizOutcome | null>(null);

  const [startedAtMs] = useState(() => Date.now());
  const instantFeedback = mode === 'practice';

  /** Existing cards, so grading a question continues its SM-2 history. */
  const [cardCache] = useState(() => {
    const cards = new Map<string, ReturnType<typeof createCard>>();
    try {
      for (const card of storageModule().getAllCards()) cards.set(card.questionId, card);
    } catch {
      // No database yet (fresh install / web): every question starts as new.
    }
    return cards;
  });

  const total = questions.length;
  const current = questions[index];

  const correctCount = useMemo(
    () =>
      answers.filter((answer) => answer.selectedIndex === answer.question.correctIndex).length,
    [answers],
  );

  const finish = useCallback(
    (finalAnswers: SimulationAnswer[]): QuizOutcome => {
      if (mode === 'simulation') {
        return { kind: 'simulation', result: scoreSimulation(testFormat, finalAnswers, startedAtMs) };
      }
      const section = scorePracticeSession(finalAnswers);
      const last = finalAnswers[finalAnswers.length - 1];
      return {
        kind: 'practice',
        section,
        correct: finalAnswers.filter((a) => a.selectedIndex === a.question.correctIndex).length,
        total: finalAnswers.length,
        durationMs: last ? last.answeredAtMs - startedAtMs : 0,
        misses: finalAnswers
          .filter((a) => a.selectedIndex !== a.question.correctIndex)
          .map((a) => a.question.id),
      };
    },
    [mode, testFormat],
  );

  const recordCard = useCallback(
    (question: Question, correct: boolean) => {
      try {
        const storage = storageModule();
        const existing = cardCache.get(question.id) ?? createCard(question.id);
        const graded = gradeCard(existing, gradeFor(correct));
        storage.saveCard(graded);
        cardCache.set(question.id, graded);
      } catch {
        // Scheduling is an enhancement; never let it break answering.
      }
    },
    [cardCache],
  );

  const select = useCallback(
    (optionIndex: number) => {
      if (finished || !current) return;
      // In practice mode the answer is locked once revealed.
      if (instantFeedback && revealed) return;

      const correct = optionIndex === current.correctIndex;
      const answer: SimulationAnswer = {
        question: current,
        selectedIndex: optionIndex,
        answeredAtMs: Date.now(),
      };
      const nextAnswers = [...answers, answer];

      setAnswers(nextAnswers);
      setSelectedIndex(optionIndex);
      recordCard(current, correct);

      if (correct) {
        void haptics.success();
      } else {
        void haptics.error();
      }

      if (instantFeedback) {
        setRevealed(true);
        return;
      }

      // Simulation: no feedback — move straight on.
      if (index + 1 >= total) {
        setFinished(true);
        setOutcome(finish(nextAnswers));
      } else {
        setIndex(index + 1);
        setSelectedIndex(null);
      }
    },
    [answers, current, finish, finished, index, instantFeedback, recordCard, revealed, total],
  );

  const next = useCallback(() => {
    if (finished) return;
    if (index + 1 >= total) {
      setFinished(true);
      setOutcome(finish(answers));
      return;
    }
    setIndex(index + 1);
    setSelectedIndex(null);
    setRevealed(false);
    void haptics.tapLight();
  }, [answers, finish, finished, index, total]);

  /** Abandon mid-run and score whatever was answered (the "End" button). */
  const quit = useCallback(() => {
    const partial = finish(answers);
    setFinished(true);
    setOutcome(partial);
    return partial;
  }, [answers, finish]);

  return {
    current,
    position: Math.min(index + 1, total),
    total,
    selectedIndex,
    revealed,
    isCorrect: revealed && current ? selectedIndex === current.correctIndex : null,
    correctCount,
    finished,
    outcome,
    select,
    next,
    quit,
  };
}
