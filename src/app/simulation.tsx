import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Paywall } from '@/components/paywall';
import { QuizRunner } from '@/components/quiz-runner';
import { SessionResult } from '@/components/session-result';
import { AppText } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { bank, freeTier, testFormat } from '@/content/ontario';
import { buildSimulation, sectionsOf } from '@/engine/sampler';
import { useDailyLimits } from '@/hooks/use-daily-limits';
import type { QuizOutcome } from '@/hooks/use-quiz-session';
import type { Question } from '@/schema/question';
import { track } from '@/services/analytics';
import { useAppStore } from '@/store/useAppStore';
import { useSubscription, selectIsPremium } from '@/store/useSubscription';
import { spacing, text } from '@/theme';

/**
 * Full simulation (build plan §2.3).
 *
 * The exam itself: `testFormat` questions split across both sections, no
 * feedback until the end, scored per section against the real 16/20 bar. One
 * simulation a day is free — a learner must be able to prove the app works on
 * the thing they are actually buying — so the free tier is enforced on *starts*
 * rather than by trimming the paper.
 */

type Phase = 'setup' | 'running' | 'result';

export default function SimulationScreen() {
  const isPremium = useSubscription(selectIsPremium);
  const recordSession = useAppStore((state) => state.recordSession);
  const limits = useDailyLimits();

  const [phase, setPhase] = useState<Phase>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [outcome, setOutcome] = useState<QuizOutcome | null>(null);

  const capReached = !isPremium && limits.simulationsRemaining <= 0;
  const sections = sectionsOf(testFormat);

  const start = useCallback(() => {
    // Never free-tier filtered: a full simulation is the honest product demo.
    setQuestions(buildSimulation(bank.questions, testFormat));
    setOutcome(null);
    setPhase('running');
    limits.recordSimulation();
    track({ event: 'simulation_started' });
  }, [limits]);

  const complete = useCallback(
    (result: QuizOutcome) => {
      setOutcome(result);
      setPhase('result');
      if (result.kind !== 'simulation') return;
      recordSession('simulation', {
        correct: result.result.correct,
        passed: result.result.passed,
        durationMs: result.result.durationMs,
        misses: result.result.misses,
      });
      track({
        event: 'simulation_finished',
        passed: result.result.passed,
        correct: result.result.correct,
        total: result.result.total,
      });
    },
    [recordSession],
  );

  const reset = useCallback(() => {
    setPhase('setup');
    setOutcome(null);
    setQuestions([]);
  }, []);

  if (phase === 'running') {
    return <QuizRunner questions={questions} mode="simulation" onComplete={complete} />;
  }

  if (phase === 'result' && outcome) {
    return <SessionResult outcome={outcome} onRetry={reset} />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">Full simulation</AppText>
        <AppText variant="small" color={text.secondary}>
          {testFormat.total} questions under the real rules. No feedback until the end — exactly
          like the test centre.
        </AppText>
      </View>

      <Card>
        <AppText variant="heading">The format</AppText>
        {sections.map((section) => (
          <View key={section} style={styles.row}>
            <AppText variant="small" color={text.secondary}>
              {section === 'signs' ? 'Road signs' : 'Rules of the road'}
            </AppText>
            <AppText variant="smallStrong">
              {testFormat.split[section]} questions
            </AppText>
          </View>
        ))}
        <View style={styles.row}>
          <AppText variant="small" color={text.secondary}>
            To pass
          </AppText>
          <AppText variant="smallStrong">
            {testFormat.passPerSection} of {testFormat.split.signs} in each section
          </AppText>
        </View>
        <AppText variant="caption" color={text.tertiary}>
          A strong total with one weak section is still a fail, so the result breaks it down
          section by section.
        </AppText>
      </Card>

      {capReached ? (
        <Paywall reason="You have used today's free simulation" />
      ) : (
        <PrimaryButton
          label="Start simulation"
          hint={isPremium ? `${testFormat.total} questions` : `${limits.simulationsRemaining} left today`}
          onPress={start}
        />
      )}

      <Card>
        <AppText variant="heading">Before you start</AppText>
        <AppText variant="small" color={text.secondary}>
          There is no time limit — the real G1 written test does not have one either, and rushing
          is how sign questions get misread. Read every option before answering.
        </AppText>
        {!isPremium ? (
          <AppText variant="caption" color={text.tertiary}>
            FREE TIER: {freeTier.simulationsPerDay} SIMULATION PER DAY
          </AppText>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
