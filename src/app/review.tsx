import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Paywall } from '@/components/paywall';
import { QuizRunner } from '@/components/quiz-runner';
import { SessionResult } from '@/components/session-result';
import { AppText } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { bank, freeTier } from '@/content/ontario';
import { buildReviewQueue, dueCount, MAX_REVIEW_QUESTIONS, nextDueCopy } from '@/engine/review';
import { useDailyLimits } from '@/hooks/use-daily-limits';
import type { QuizOutcome } from '@/hooks/use-quiz-session';
import type { Question } from '@/schema/question';
import { track } from '@/services/analytics';
import { useAppStore } from '@/store/useAppStore';
import { useSubscription, selectIsPremium } from '@/store/useSubscription';
import { feedback, spacing, text } from '@/theme';

/**
 * Review (build plan §1.3).
 *
 * The payoff for the SM-2 scheduling that runs quietly during practice and
 * simulations: whatever is due today, most overdue first. A question is only
 * ever here because the learner already met it, so the queue is never a wall of
 * unseen content.
 *
 * Scheduling is the premium feature (`freeTier.spacedRepetition`), so the free
 * tier sees the queue's size and what it would do for them rather than a locked
 * door with no explanation.
 */

type Phase = 'idle' | 'running' | 'result';

function storageModule() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/services/storage') as typeof import('@/services/storage');
}

/** Read the card table; a storage failure means "nothing scheduled yet". */
function readCards() {
  try {
    return storageModule().getAllCards();
  } catch {
    return [];
  }
}

export default function ReviewScreen() {
  const isPremium = useSubscription(selectIsPremium);
  const recordSession = useAppStore((state) => state.recordSession);
  const limits = useDailyLimits();

  const [phase, setPhase] = useState<Phase>('idle');
  const [cards, setCards] = useState(readCards);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [outcome, setOutcome] = useState<QuizOutcome | null>(null);

  const scheduled = cards.length;
  const waiting = useMemo(() => dueCount(cards), [cards]);

  const start = useCallback(() => {
    const queue = buildReviewQueue(bank.questions, cards);
    setQuestions(queue);
    setOutcome(null);
    setPhase('running');
    track({ event: 'review_started' });
  }, [cards]);

  const complete = useCallback(
    (result: QuizOutcome) => {
      setOutcome(result);
      setPhase('result');
      // Grading happens inside `useQuizSession`, so the only job here is to
      // re-read the table — the queue the learner just worked through is now
      // scheduled into the future and should disappear from it.
      setCards(readCards());
      if (result.kind !== 'practice') return;
      recordSession('practice', {
        correct: result.correct,
        passed: false,
        durationMs: result.durationMs,
        misses: result.misses,
      });
      track({ event: 'review_finished', reviewed: result.total });
    },
    [recordSession],
  );

  const reset = useCallback(() => {
    setPhase('idle');
    setOutcome(null);
    setQuestions([]);
  }, []);

  if (phase === 'running') {
    return <QuizRunner questions={questions} mode="practice" onComplete={complete} />;
  }

  if (phase === 'result' && outcome) {
    return <SessionResult outcome={outcome} onRetry={reset} />;
  }

  const locked = !isPremium && !freeTier.spacedRepetition;

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">Review</AppText>
        <AppText variant="small" color={text.secondary}>
          The questions you missed, resurfaced on a schedule that widens every time you get one
          right.
        </AppText>
      </View>

      <Card tone={waiting > 0 ? 'raised' : 'card'} style={styles.queueCard}>
        <AppText variant="display" color={waiting > 0 ? feedback.correct : text.tertiary}>
          {waiting}
        </AppText>
        <AppText variant="caption" color={text.tertiary}>
          {waiting === 1 ? 'CARD DUE NOW' : 'CARDS DUE NOW'}
        </AppText>
        <AppText variant="small" color={text.secondary} style={styles.center}>
          {waiting > 0
            ? `Up to ${Math.min(waiting, MAX_REVIEW_QUESTIONS)} in this round · ${scheduled} scheduled in total`
            : nextDueCopy(cards)}
        </AppText>
      </Card>

      {locked ? (
        <Paywall reason="Spaced repetition is part of Premium" />
      ) : waiting > 0 ? (
        <PrimaryButton
          label="Start review"
          hint={`${Math.min(waiting, MAX_REVIEW_QUESTIONS)} cards`}
          onPress={start}
        />
      ) : (
        <Card>
          <AppText variant="heading">Nothing to review yet</AppText>
          <AppText variant="small" color={text.secondary}>
            {scheduled === 0
              ? 'Answer a practice round and every question you miss is added to this queue automatically.'
              : 'You are up to date. Come back tomorrow — or run a practice round to add more.'}
          </AppText>
        </Card>
      )}

      {!locked && waiting > 0 ? (
        <Card>
          <AppText variant="heading">How the schedule works</AppText>
          <View style={styles.rule}>
            <AppText variant="smallStrong" color={feedback.incorrect}>
              Missed
            </AppText>
            <AppText variant="small" color={text.secondary}>
              Comes back tomorrow
            </AppText>
          </View>
          <View style={styles.rule}>
            <AppText variant="smallStrong" color={feedback.correct}>
              Recalled
            </AppText>
            <AppText variant="small" color={text.secondary}>
              Pushed further out each time — 1 day, 6 days, then wider
            </AppText>
          </View>
          <AppText variant="caption" color={text.tertiary}>
            {limits.practiceUsed} QUESTIONS ANSWERED TODAY
          </AppText>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
  },
  queueCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  center: {
    textAlign: 'center',
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
