import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ReadinessRing } from '@/components/readiness-ring';
import { StatTile } from '@/components/stat-tile';
import { AppText } from '@/components/ui/app-text';
import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { bank, region, testFormat } from '@/content/ontario';
import { answeredCount, readinessFromHistory, totalAnswered, type SessionLike } from '@/engine/history';
import { bandForScore } from '@/engine/readinessScore';
import { useAppStore } from '@/store/useAppStore';
import { colors, feedback, radii, spacing, text } from '@/theme';

/**
 * Home — "am I ready yet?" (build plan §2.4).
 *
 * Everything here is derived from stored history, so a learner who has never
 * finished a round sees honest zeros and one obvious next action rather than
 * fake progress.
 */
export default function HomeScreen() {
  const router = useRouter();
  const sessions = useAppStore((state) => state.sessions);
  const streak = useAppStore((state) => state.streak);
  const settings = useAppStore((state) => state.settings);
  const hydrated = useAppStore((state) => state.hydrated);

  const readiness = useMemo(() => readinessFromHistory(sessions), [sessions]);
  const band = bandForScore(readiness);
  const simulations = useMemo(
    () => sessions.filter((session) => session.type === 'simulation'),
    [sessions],
  );
  const answered = useMemo(() => totalAnswered(sessions), [sessions]);
  const coverage = Math.min(100, Math.round((bank.questions.length / testFormat.bankTarget) * 100));
  const daysToTest = daysUntil(settings.testDate);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="title">{region.appName}</AppText>
          <AppText variant="small" color={text.secondary}>
            {region.name} {region.licenceStage} knowledge test
          </AppText>
        </View>
        <View style={styles.streakChip}>
          <AppText variant="caption" color={streak > 0 ? feedback.correct : text.tertiary}>
            {streak > 0 ? `${streak} DAY STREAK` : 'NO STREAK YET'}
          </AppText>
        </View>
      </View>

      <Card style={styles.readinessCard}>
        <ReadinessRing score={readiness} />
        {!hydrated ? (
          <AppText variant="caption" color={text.tertiary} style={styles.center}>
            LOADING YOUR HISTORY…
          </AppText>
        ) : answered === 0 ? (
          <AppText variant="small" color={text.secondary} style={styles.center}>
            Answer a practice round to start measuring your readiness.
          </AppText>
        ) : (
          <AppText variant="caption" color={text.tertiary} style={styles.center}>
            {band === 'ready' ? 'TEST READY' : 'FROM YOUR LAST 6 SESSIONS'}
          </AppText>
        )}
      </Card>

      <Card>
        <AppText variant="heading">Start a round</AppText>
        <AppText variant="small" color={text.secondary}>
          The real test is {testFormat.total} questions — {testFormat.split.signs} signs and{' '}
          {testFormat.split.rules} rules — and needs {testFormat.passPerSection} right in each
          section.
        </AppText>
        <PrimaryButton
          label="Practice"
          hint="answers explained"
          onPress={() => router.push('/practice')}
        />
        <SecondaryButton
          label="Full simulation"
          hint={`${testFormat.total} questions`}
          onPress={() => router.push('/simulation')}
        />
      </Card>

      <Card>
        <View style={styles.statsRow}>
          <StatTile label="Streak" value={streak} emphasis />
          <StatTile label="Answered" value={answered} emphasis />
          <StatTile label="Tests" value={simulations.length} emphasis />
        </View>
        <View style={styles.divider} />
        <View style={styles.progressRow}>
          <AppText variant="small" color={text.secondary}>
            Question bank
          </AppText>
          <AppText variant="smallStrong" color={text.secondary}>
            {bank.questions.length} of {testFormat.bankTarget}
          </AppText>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${coverage}%` }]} />
        </View>
      </Card>

      {settings.testDateEnabled && settings.testDate ? (
        <Card tone="raised">
          <AppText variant="caption" color={text.tertiary}>
            YOUR G1 TEST
          </AppText>
          <AppText
            variant="display"
            color={daysToTest !== null && daysToTest <= 3 ? feedback.correct : text.primary}>
            {daysToTest === null ? '—' : daysToTest}
          </AppText>
          <AppText variant="small" color={text.secondary}>
            {daysToTest === null
              ? 'That date looks invalid — fix it in your profile.'
              : daysToTest === 0
                ? 'Today. Good luck.'
                : `${daysToTest === 1 ? 'day' : 'days'} to go · ${settings.testDate}`}
          </AppText>
        </Card>
      ) : (
        <SecondaryButton
          label="Add your test date"
          hint="countdown"
          onPress={() => router.push('/profile')}
        />
      )}

      <Card>
        <AppText variant="heading">Recent sessions</AppText>
        {sessions.length === 0 ? (
          <AppText variant="small" color={text.secondary}>
            Nothing yet. Your practice rounds and simulations show up here.
          </AppText>
        ) : (
          sessions.slice(0, 4).map((session) => (
            <View key={session.id} style={styles.sessionRow}>
              <View style={styles.sessionLeft}>
                <AppText variant="smallStrong">
                  {session.type === 'simulation' ? 'Full simulation' : 'Practice'}
                </AppText>
                <AppText variant="caption" color={text.tertiary}>
                  {formatDay(session.startedAt)} · {session.scored}/{answeredCount(session)} correct
                </AppText>
              </View>
              <AppText variant="smallStrong" color={session.passed ? feedback.correct : text.secondary}>
                {session.passed ? 'PASS' : `${accuracyPercent(session)}%`}
              </AppText>
            </View>
          ))
        )}
      </Card>

      <AppText variant="code" color={text.tertiary} style={styles.footer}>
        Content v{bank.version} · verified {bank.verifiedAt} · {region.authority} handbook{' '}
        {region.handbookEdition}
      </AppText>
    </Screen>
  );
}

/** Whole days from today to an ISO date, or null when unset/invalid. */
function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function accuracyPercent(session: SessionLike): number {
  const total = answeredCount(session);
  return total === 0 ? 0 : Math.round((session.scored / total) * 100);
}

function formatDay(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  streakChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaces.card,
    borderWidth: 1,
    borderColor: colors.surfaces.border,
  },
  readinessCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  center: {
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaces.border,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  track: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaces.cardPressed,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.brand.violetBright,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sessionLeft: {
    flex: 1,
    gap: 2,
  },
  footer: {
    textAlign: 'center',
  },
});
