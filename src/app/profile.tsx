import * as WebBrowser from 'expo-web-browser';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';

import { Paywall, PremiumBadge } from '@/components/paywall';
import { StatTile } from '@/components/stat-tile';
import { AppText } from '@/components/ui/app-text';
import { SecondaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { bank, freeTier, region, testFormat } from '@/content/ontario';
import { answeredCount, totalAnswered } from '@/engine/history';
import { useAppStore, persistSettings, type AppSettings } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSubscription, selectIsPremium } from '@/store/useSubscription';
import { colors, feedback, fontFamily, radii, spacing, text, touchTarget } from '@/theme';

/**
 * Profile (build plan §2.5, §4.3, §7).
 *
 * The honest inventory screen: what the learner has done, what the app costs,
 * where the content comes from, and the two settings that change behaviour
 * (test countdown, haptics). Everything writes straight through to SQLite via
 * `persistSettings` so a settings change survives a cold start.
 *
 * The paywall lives here too — the Profile tab is where a learner goes looking
 * for "what am I paying for?", so that question should be answered on arrival
 * rather than behind another tap.
 */

export default function ProfileScreen() {
  const settings = useAppStore((state) => state.settings);
  const setSettings = useAppStore((state) => state.setSettings);
  const sessions = useAppStore((state) => state.sessions);
  const streak = useAppStore((state) => state.streak);

  const isPremium = useSubscription(selectIsPremium);
  const configured = useSubscription((state) => state.configured);

  const userId = useAuthStore((state) => state.userId);
  const authConfigured = useAuthStore((state) => state.configured);
  const clearSession = useAuthStore((state) => state.clearSession);

  const [dateDraft, setDateDraft] = useState(settings.testDate ?? '');
  const [dateError, setDateError] = useState<string | null>(null);

  /** Write a settings patch to both the store and SQLite. */
  const update = useCallback(
    (patch: Partial<AppSettings>) => {
      setSettings(patch);
      persistSettings({ ...settings, ...patch });
    },
    [setSettings, settings],
  );

  const answered = useMemo(() => totalAnswered(sessions), [sessions]);
  const simulations = useMemo(
    () => sessions.filter((session) => session.type === 'simulation'),
    [sessions],
  );
  const passes = simulations.filter((session) => session.passed).length;
  const bestPercent = useMemo(() => {
    const scores = simulations.map((session) => {
      const total = answeredCount(session);
      return total === 0 ? 0 : Math.round((session.scored / total) * 100);
    });
    return scores.length === 0 ? 0 : Math.max(...scores);
  }, [simulations]);

  const saveDate = useCallback(() => {
    const trimmed = dateDraft.trim();
    if (trimmed === '') {
      setDateError(null);
      update({ testDate: null, testDateEnabled: false });
      return;
    }
    if (!isIsoDate(trimmed)) {
      setDateError('Use the format yyyy-mm-dd, e.g. 2026-11-04.');
      return;
    }
    setDateError(null);
    update({ testDate: trimmed, testDateEnabled: true });
  }, [dateDraft, update]);

  const openHandbook = useCallback(() => {
    void WebBrowser.openBrowserAsync(region.handbookUrl);
  }, []);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="title">Profile</AppText>
          <AppText variant="small" color={text.secondary}>
            {region.appName} · {region.name} {region.licenceStage}
          </AppText>
        </View>
        <PremiumBadge isPremium={isPremium} />
      </View>

      <Card>
        <AppText variant="heading">Your numbers</AppText>
        <View style={styles.statsRow}>
          <StatTile label="Streak" value={streak} emphasis />
          <StatTile label="Answered" value={answered} emphasis />
          <StatTile label="Tests" value={simulations.length} emphasis />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <AppText variant="small" color={text.secondary}>
            Simulations passed
          </AppText>
          <AppText variant="smallStrong">
            {passes} of {simulations.length}
          </AppText>
        </View>
        <View style={styles.row}>
          <AppText variant="small" color={text.secondary}>
            Best simulation
          </AppText>
          <AppText variant="smallStrong">{bestPercent}%</AppText>
        </View>
        <View style={styles.row}>
          <AppText variant="small" color={text.secondary}>
            Pass bar
          </AppText>
          <AppText variant="smallStrong">
            {testFormat.passPerSection}/{testFormat.split.signs} per section
          </AppText>
        </View>
      </Card>

      <Card>
        <AppText variant="heading">Your test date</AppText>
        <AppText variant="small" color={text.secondary}>
          Set it and Home counts down the days. Leave it blank if you have not booked yet.
        </AppText>
        <TextInput
          value={dateDraft}
          onChangeText={setDateDraft}
          placeholder="yyyy-mm-dd"
          placeholderTextColor={text.tertiary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
          accessibilityLabel="G1 test date"
          style={styles.input}
        />
        {dateError ? (
          <AppText variant="caption" color={feedback.incorrect}>
            {dateError.toUpperCase()}
          </AppText>
        ) : null}
        <SecondaryButton label="Save date" onPress={saveDate} />
        {settings.testDateEnabled && settings.testDate ? (
          <AppText variant="caption" color={feedback.correct}>
            COUNTDOWN ON · {settings.testDate}
          </AppText>
        ) : null}
      </Card>

      <Card>
        <AppText variant="heading">Settings</AppText>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <AppText variant="body">Haptic feedback</AppText>
            <AppText variant="caption" color={text.tertiary}>
              A tap when you answer, a buzz when you get it wrong
            </AppText>
          </View>
          <Switch
            value={settings.hapticsEnabled}
            onValueChange={(value) => update({ hapticsEnabled: value })}
            trackColor={{ false: colors.surfaces.cardPressed, true: colors.brand.violetDim }}
            thumbColor={settings.hapticsEnabled ? colors.brand.violetBright : text.tertiary}
            accessibilityLabel="Haptic feedback"
          />
        </View>
      </Card>

      {isPremium ? (
        <Card tone="raised">
          <AppText variant="heading">Premium</AppText>
          <AppText variant="small" color={text.secondary}>
            Every question, no daily cap, and spaced-repetition review. Thank you — that keeps the
            content coming.
          </AppText>
          <SecondaryButton
            label="Manage subscription"
            onPress={() => void WebBrowser.openBrowserAsync('https://apps.apple.com/account/subscriptions')}
          />
        </Card>
      ) : (
        <Paywall reason="Unlock the whole bank" />
      )}

      <Card>
        <AppText variant="heading">Where this comes from</AppText>
        <AppText variant="small" color={text.secondary}>
          Every question is written against the {region.authority} Driver&apos;s Handbook and
          carries its own handbook reference. Signs are described in words until the image pack
          ships.
        </AppText>
        <SecondaryButton
          label={`${region.authority} Driver's Handbook`}
          hint="opens in browser"
          onPress={openHandbook}
        />
        <AppText variant="code" color={text.tertiary}>
          {region.handbookEdition} · content v{bank.version} · verified {bank.verifiedAt}
        </AppText>
        <AppText variant="code" color={text.tertiary}>
          {bank.questions.length} of {testFormat.bankTarget} target questions written
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading">Account</AppText>
        {!authConfigured ? (
          <AppText variant="small" color={text.secondary}>
            You are using {region.appName} on this device only. Everything you do is stored
            locally and nothing is uploaded.
          </AppText>
        ) : userId ? (
          <>
            <AppText variant="small" color={text.secondary}>
              Signed in. Your progress backs up and syncs across your devices.
            </AppText>
            <SecondaryButton label="Sign out" onPress={() => void clearSession()} />
          </>
        ) : (
          <AppText variant="small" color={text.secondary}>
            Not signed in. Progress is on this device only — signing in would back it up.
          </AppText>
        )}
        {!configured ? (
          <AppText variant="caption" color={text.tertiary}>
            SUBSCRIPTIONS ARE NOT CONFIGURED IN THIS BUILD
          </AppText>
        ) : null}
      </Card>

      <AppText variant="caption" color={text.tertiary} style={styles.footer}>
        FREE TIER: {freeTier.practicePerDay} PRACTICE QUESTIONS AND {freeTier.simulationsPerDay}{' '}
        SIMULATION PER DAY
      </AppText>
    </Screen>
  );
}

/** True for a real yyyy-mm-dd date (rejects 2026-02-31). */
function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  // A rolled-over date (Feb 31 → Mar 3) does not round-trip.
  const [year, month, day] = value.split('-').map(Number);
  return (
    parsed.getFullYear() === year && parsed.getMonth() + 1 === month && parsed.getDate() === day
  );
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaces.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  input: {
    minHeight: touchTarget,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surfaces.border,
    backgroundColor: colors.surfaces.cardPressed,
    paddingHorizontal: spacing.md,
    color: text.primary,
    fontFamily: fontFamily.body,
    fontSize: 16,
  },
  footer: {
    textAlign: 'center',
  },
});
