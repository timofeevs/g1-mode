import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { OptionRow, type OptionState } from '@/components/option-row';
import { QuestionCard } from '@/components/question-card';
import { AppText } from '@/components/ui/app-text';
import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ScreenBody } from '@/components/ui/screen';
import { testFormat } from '@/content/ontario';
import type { QuizMode, QuizOutcome } from '@/hooks/use-quiz-session';
import { useQuizSession } from '@/hooks/use-quiz-session';
import type { Question } from '@/schema/question';
import { spacing, text } from '@/theme';

/**
 * The quiz surface shared by Practice and Simulation (build plan §2.2, §2.3).
 *
 * The two modes differ in exactly one visible way: practice reveals the answer
 * and its explanation before moving on, a simulation never does — the real test
 * gives no feedback until the end, so neither do we.
 *
 * `onComplete` fires once per run; the screen decides what to persist.
 */
export function QuizRunner({
  questions,
  mode,
  onComplete,
}: {
  questions: readonly Question[];
  mode: QuizMode;
  onComplete: (outcome: QuizOutcome) => void;
}) {
  const session = useQuizSession(questions, mode, testFormat);
  const recorded = useRef(false);

  useEffect(() => {
    if (!session.finished || !session.outcome || recorded.current) return;
    recorded.current = true;
    onComplete(session.outcome);
  }, [onComplete, session.finished, session.outcome]);

  const { current, revealed, selectedIndex, position, total } = session;

  if (!current) {
    return (
      <ScreenBody>
        <AppText variant="body" color={text.secondary}>
          No questions available for this round.
        </AppText>
      </ScreenBody>
    );
  }

  const stateFor = (index: number): OptionState => {
    if (mode === 'simulation') return selectedIndex === index ? 'selected' : 'idle';
    if (!revealed) return selectedIndex === index ? 'selected' : 'idle';
    if (index === current.correctIndex) return 'correct';
    if (index === selectedIndex) return 'incorrect';
    return 'idle';
  };

  const isLast = position >= total;

  return (
    <ScreenBody>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="caption" color={text.tertiary}>
            {mode === 'simulation' ? 'SIMULATION' : 'PRACTICE'} · {session.correctCount} CORRECT
          </AppText>
          <AppText variant="small" color={text.secondary}>
            {revealed ? (session.isCorrect ? 'Nice — that one is yours.' : 'Not quite. Here is why.') : 'Pick the best answer.'}
          </AppText>
        </View>
        <SecondaryButton label="End" onPress={() => session.quit()} />
      </View>

      <ProgressBar value={position - (revealed ? 0 : 1)} total={total} />

      <QuestionCard
        question={current}
        position={position}
        total={total}
        explanation={revealed ? current.explanation : undefined}
        showCategory={mode === 'practice'}
      />

      <View style={styles.options}>
        {current.options.map((option, index) => (
          <OptionRow
            key={`${current.id}-${index}`}
            label={option}
            index={index}
            state={stateFor(index)}
            dimmed={revealed && index !== current.correctIndex && index !== selectedIndex}
            disabled={revealed}
            onPress={() => session.select(index)}
          />
        ))}
      </View>

      <View style={styles.footer}>
        {mode === 'practice' && revealed ? (
          <PrimaryButton
            label={isLast ? 'See results' : 'Next question'}
            onPress={() => session.next()}
          />
        ) : mode === 'simulation' ? (
          <AppText variant="caption" color={text.tertiary} style={styles.center}>
            NO FEEDBACK UNTIL THE END — JUST LIKE THE REAL TEST
          </AppText>
        ) : (
          <AppText variant="caption" color={text.tertiary} style={styles.center}>
            TAP AN ANSWER TO CHECK IT
          </AppText>
        )}
      </View>
    </ScreenBody>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  options: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.lg,
  },
  center: {
    textAlign: 'center',
  },
});
