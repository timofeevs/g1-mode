import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { SecondaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { products, region, testFormat } from '@/content/ontario';
import { track } from '@/services/analytics';
import { useSubscription } from '@/store/useSubscription';
import { feedback, spacing, text } from '@/theme';

/**
 * Premium upsell (build plan §3.3, §7).
 *
 * Shown only where the free tier actually stops — the end of the daily practice
 * cap, the second simulation of the day, and the Review tab — so it reads as an
 * explanation rather than an interruption. The pitch is deliberately concrete:
 * what the free tier did *not* include, not adjectives.
 *
 * Prices come from the stores, never from code, so this component names the
 * plans and lets the store sheet show the money. `restore` is always offered:
 * both stores require it, and a learner who already paid must never be asked to
 * pay twice.
 */

const PLANS: { id: string; label: string; detail: string }[] = [
  { id: products.monthly, label: '1 month', detail: 'Enough for a test booked next month' },
  { id: products.quarterly, label: '3 months', detail: 'Best value if your test is a way off' },
  { id: products.lifetime, label: 'Lifetime', detail: 'One payment, every update' },
];

export function Paywall({ reason }: { reason?: string }) {
  const configured = useSubscription((state) => state.configured);
  const busy = useSubscription((state) => state.busy);
  const error = useSubscription((state) => state.error);
  const buy = useSubscription((state) => state.buy);
  const restorePurchases = useSubscription((state) => state.restorePurchases);

  useEffect(() => {
    track({ event: 'paywall_opened' });
  }, []);

  return (
    <>
      <Card tone="raised" style={styles.hero}>
        <AppText variant="caption" color={text.tertiary}>
          G1 MODE PREMIUM
        </AppText>
        <AppText variant="heading">{reason ?? 'Keep going without the daily cap'}</AppText>
        <AppText variant="small" color={text.secondary}>
          Premium removes every limit and unlocks spaced-repetition review, so the questions you
          miss keep coming back until they stick. All {testFormat.bankTarget} questions, no
          per-day cap.
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading">Choose a plan</AppText>
        {PLANS.map((plan) => (
          <View key={plan.id} style={styles.plan}>
            <View style={styles.planText}>
              <AppText variant="bodyStrong">{plan.label}</AppText>
              <AppText variant="caption" color={text.tertiary}>
                {plan.detail}
              </AppText>
            </View>
            <SecondaryButton
              label="Choose"
              disabled={!configured || busy}
              onPress={() => void buy(plan.id)}
              style={styles.planButton}
            />
          </View>
        ))}

        {busy ? <ActivityIndicator color={feedback.correct} /> : null}
        {error ? (
          <AppText variant="small" color={feedback.incorrect}>
            {error}
          </AppText>
        ) : null}
        {!configured ? (
          <AppText variant="caption" color={text.tertiary}>
            SUBSCRIPTIONS ARE NOT CONFIGURED IN THIS BUILD — ADD THE REVENUECAT KEYS TO ENABLE THEM
          </AppText>
        ) : null}

        <SecondaryButton
          label="Restore purchases"
          disabled={!configured || busy}
          onPress={() => void restorePurchases()}
        />
        <AppText variant="caption" color={text.tertiary}>
          {region.appName} · {region.name} {region.licenceStage}. Billed through your app store
          account; cancel any time from your store subscriptions.
        </AppText>
      </Card>
    </>
  );
}

/** A one-line premium status chip for the Profile screen. */
export function PremiumBadge({ isPremium }: { isPremium: boolean }) {
  return (
    <View style={[styles.badge, isPremium && styles.badgePremium]}>
      <AppText variant="caption" color={isPremium ? feedback.correct : text.tertiary}>
        {isPremium ? 'PREMIUM' : 'FREE TIER'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm,
  },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  planText: {
    flex: 1,
    gap: 2,
  },
  planButton: {
    minWidth: 108,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  badgePremium: {
    borderColor: feedback.correctBorder,
    backgroundColor: feedback.correctSurface,
  },
});
