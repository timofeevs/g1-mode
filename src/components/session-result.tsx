import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { testFormat } from '@/content/ontario';
import type { QuizOutcome } from '@/hooks/use-quiz-session';
import { colors, feedback, radii, spacing, text } from '@/theme';

/**
 * Result panel for both quiz modes.
 *
 * A simulation is scored per section because the real test is: 16/20 in each
 * section, so a strong total with a weak section is still a fail. Practice is
 * a single percentage — it is for learning, not for passing.
 */
export function SessionResult({ outcome, onRetry }: { outcome: QuizOutcome; onRetry: () => void }) {
  const router = useRouter();

  if (outcome.kind === 'practice') {
    const percent = outcome.total === 0 ? 0 : Math.round((outcome.correct / outcome.total) * 100);
    return (
      <Screen>
        <Card tone="raised" style={styles.heroCard}>
          <AppText variant="caption" color={text.tertiary}>
            PRACTICE COMPLETE
          </AppText>
          <AppText variant="display" color={percent >= 80 ? feedback.correct : text.primary}>
            {percent}%
          </AppText>
          <AppText variant="small" color={text.secondary}>
            {outcome.correct} of {outcome.total} correct · {formatDuration(outcome.durationMs)}
          </AppText>
        </Card>

        <Card>
          <AppText variant="heading">What to do next</AppText>
          <AppText variant="small" color={text.secondary}>
            {outcome.misses.length === 0
              ? 'Clean sweep. Bump the difficulty by running a full simulation.'
              : `${outcome.misses.length} question${outcome.misses.length === 1 ? '' : 's'} slipped — they are queued in Review so they come back when they matter.`}
          </AppText>
          {outcome.misses.length > 0 ? (
            <PrimaryButton label="Review your misses" onPress={() => router.push('/review')} />
          ) : null}
          <SecondaryButton label="Practise again" onPress={onRetry} />
          <SecondaryButton label="Back to home" onPress={() => router.replace('/')} />
        </Card>
      </Screen>
    );
  }

  const { result } = outcome;
  const failedSections = result.sections.filter((section) => !section.passed);

  return (
    <Screen>
      <Card tone="raised" style={styles.heroCard}>
        <AppText variant="caption" color={text.tertiary}>
          SIMULATION RESULT
        </AppText>
        <AppText variant="display" color={result.passed ? feedback.correct : feedback.incorrect}>
          {result.passed ? 'PASS' : 'NOT YET'}
        </AppText>
        <AppText variant="small" color={text.secondary}>
          {result.correct} of {result.total} correct · {formatDuration(result.durationMs)}
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading">Sections</AppText>
        <AppText variant="small" color={text.secondary}>
          {testFormat.passPerSection} of {testFormat.split.signs} needed in each section.
        </AppText>
        {result.sections.map((section) => (
          <View key={section.category} style={styles.sectionRow}>
            <View style={styles.sectionLeft}>
              <AppText variant="smallStrong">
                {section.category === 'signs' ? 'Road signs' : 'Rules of the road'}
              </AppText>
              <AppText variant="caption" color={text.tertiary}>
                {section.correct} of {section.total}
              </AppText>
            </View>
            <View
              style={[
                styles.pill,
                { borderColor: section.passed ? feedback.correctBorder : feedback.incorrectBorder },
              ]}>
              <AppText
                variant="caption"
                color={section.passed ? feedback.correct : feedback.incorrect}>
                {section.passed ? 'PASS' : 'FAIL'}
              </AppText>
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <AppText variant="heading">What to do next</AppText>
        <AppText variant="small" color={text.secondary}>
          {result.passed
            ? 'That is a pass on the real bar. Keep the edge with review rounds until test day.'
            : failedSections.length > 0
              ? `Your ${failedSections
                  .map((section) => (section.category === 'signs' ? 'road signs' : 'rules'))
                  .join(' and ')} section is short of the bar.`
              : 'Close. One more run after a review round should do it.'}
        </AppText>
        {result.misses.length > 0 ? (
          <PrimaryButton label="Review your misses" onPress={() => router.push('/review')} />
        ) : null}
        <SecondaryButton label="Run it again" onPress={onRetry} />
        <SecondaryButton label="Back to home" onPress={() => router.replace('/')} />
      </Card>
    </Screen>
  );
}

/** "2m 14s" / "48s". */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

const styles = StyleSheet.create({
  heroCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionLeft: {
    flex: 1,
    gap: 2,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: colors.surfaces.cardPressed,
  },
});
