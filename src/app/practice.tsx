import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Paywall } from '@/components/paywall';
import { QuizRunner } from '@/components/quiz-runner';
import { SessionResult } from '@/components/session-result';
import { AppText } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SelectChip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { bank, freeTier, region, testFormat } from '@/content/ontario';
import { sampleQuestions } from '@/engine/sampler';
import { useDailyLimits } from '@/hooks/use-daily-limits';
import type { QuizOutcome } from '@/hooks/use-quiz-session';
import type { Question, QuestionCategory } from '@/schema/question';
import { track } from '@/services/analytics';
import { useAppStore } from '@/store/useAppStore';
import { useSubscription, selectIsPremium } from '@/store/useSubscription';
import { text } from '@/theme';

/**
 * Practice (build plan §2.2).
 *
 * Practice is the teaching mode: the answer and its explanation are revealed
 * the moment the learner commits, and the question is scheduled in SM-2 whether
 * they got it right or wrong. Screens never pick questions — the sampler owns
 * the shuffle and the "free questions only" rule, so a free learner can never
 * be shown premium content by accident.
 */

type Phase = 'setup' | 'running' | 'result';

type Filter = 'mixed' | QuestionCategory;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'mixed', label: 'Mixed' },
  { id: 'signs', label: 'Road signs' },
  { id: 'rules', label: 'Rules' },
];

export default function PracticeScreen() {
  const isPremium = useSubscription(selectIsPremium);
  const recordSession = useAppStore((state) => state.recordSession);
  const limits = useDailyLimits();

  const [phase, setPhase] = useState<Phase>('setup');
  const [filter, setFilter] = useState<Filter>('mixed');
  const [length, setLength] = useState(testFormat.practiceLengths[0]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [outcome, setOutcome] = useState<QuizOutcome | null>(null);

  /** The pool a free learner is allowed to draw from. */
  const pool = useMemo(
    () => (isPremium ? bank.questions : bank.questions.filter((question) => question.isFree)),
    [isPremium],
  );

  const poolSize = useMemo(
    () =>
      filter === 'mixed' ? pool.length : pool.filter((question) => question.category === filter).length,
    [filter, pool],
  );

  const capReached = !isPremium && limits.practiceRemaining <= 0;

  /**
   * What the round will actually be. A free learner who still has 3 questions
   * left and asks for 10 gets 3 and is told so — trimming to the allowance beats
   * silently refusing to start.
   */
  const roundLength = isPremium ? length : Math.min(length, limits.practiceRemaining);

  const start = useCallback(() => {
    const picked = sampleQuestions(pool, roundLength, {
      category: filter === 'mixed' ? undefined : filter,
      freeOnly: !isPremium,
    });
    setQuestions(picked);
    setOutcome(null);
    setPhase('running');
    track({ event: 'practice_started', length: picked.length, category: filter });
  }, [filter, isPremium, pool, roundLength]);

  const complete = useCallback(
    (result: QuizOutcome) => {
      setOutcome(result);
      setPhase('result');
      if (result.kind !== 'practice') return;
      limits.recordPractice(result.total);
      recordSession('practice', {
        correct: result.correct,
        passed: result.section?.passed ?? false,
        durationMs: result.durationMs,
        misses: result.misses,
      });
      track({ event: 'practice_finished', correct: result.correct, total: result.total });
    },
    [limits, recordSession],
  );

  const reset = useCallback(() => {
    setPhase('setup');
    setOutcome(null);
    setQuestions([]);
  }, []);

  if (phase === 'running') {
    return <QuizRunner questions={questions} mode="practice" onComplete={complete} />;
  }

  if (phase === 'result' && outcome) {
    return <SessionResult outcome={outcome} onRetry={reset} />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">Practice</AppText>
        <AppText variant="small" color={text.secondary}>
          Every answer is explained straight away, and anything you miss comes back in Review.
        </AppText>
      </View>

      <Card>
        <AppText variant="heading">What to work on</AppText>
        <View style={styles.chipRow}>
          {FILTERS.map((option) => (
            <SelectChip
              key={option.id}
              label={option.label}
              selected={filter === option.id}
              onPress={() => setFilter(option.id)}
            />
          ))}
        </View>
        <AppText variant="caption" color={text.tertiary}>
          {poolSize} QUESTION{poolSize === 1 ? '' : 'S'} AVAILABLE
          {isPremium ? '' : ' ON THE FREE TIER'}
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading">How many questions</AppText>
        <View style={styles.chipRow}>
          {testFormat.practiceLengths.map((option) => (
            <SelectChip
              key={option}
              label={`${option}`}
              selected={length === option}
              disabled={!isPremium && option > limits.practiceRemaining}
              onPress={() => setLength(option)}
            />
          ))}
        </View>
        <AppText variant="caption" color={text.tertiary}>
          {isPremium
            ? 'UNLIMITED PRACTICE'
            : `${limits.practiceRemaining} OF ${freeTier.practicePerDay} FREE QUESTIONS LEFT TODAY`}
        </AppText>
      </Card>

      {capReached ? (
        <Paywall reason="That is today's free practice done" />
      ) : (
        <PrimaryButton
          label="Start practice"
          hint={`${roundLength} question${roundLength === 1 ? '' : 's'}`}
          onPress={start}
        />
      )}

      <AppText variant="code" color={text.tertiary} style={styles.footer}>
        {region.authority} Driver&apos;s Handbook {region.handbookEdition} · content v{bank.version}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  footer: {
    textAlign: 'center',
  },
});
