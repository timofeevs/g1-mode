import { Platform } from 'react-native';

/**
 * PostHog analytics (build plan §2.1, §5).
 *
 * Fire-and-forget by design: analytics can never block or break a quiz flow.
 * Every call is guarded so a misconfigured key or an offline device is a no-op.
 *
 * The native PostHog client (`posthog-react-native`) is only initialised when
 * `EXPO_PUBLIC_ENABLE_ANALYTICS=true` and a publishable key is present (see
 * `.env.example`). Until then, `track`/`identify` are safe no-ops.
 */

export type AnalyticsEvent =
  | { event: 'app_open' }
  | { event: 'practice_started'; length: number; category?: string }
  | { event: 'practice_finished'; correct: number; total: number }
  | { event: 'simulation_started' }
  | { event: 'simulation_finished'; passed: boolean; correct: number; total: number }
  | { event: 'review_started' }
  | { event: 'review_finished'; reviewed: number }
  | { event: 'paywall_opened' }
  | { event: 'subscription_restored' };

const enabled = process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true';

/** PostHog accepts plain JSON-serialisable values as event properties. */
type EventProperties = Record<string, string | number | boolean | null>;

let posthog: { capture: (event: string, props?: EventProperties) => void } | null = null;

/** Initialise PostHog once, at app start, if analytics is enabled. */
export function initAnalytics() {
  if (!enabled || posthog) return;
  try {
    // Lazy require so a missing dependency can never crash module load.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PostHog } = require('posthog-react-native') as typeof import('posthog-react-native');
    const key = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
    const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
    if (!key) return;
    const client = new PostHog(key, {
      host,
      // Mobile PostHog buffers and flushes on its own schedule.
      disabled: false,
    });
    posthog = {
      capture: (event: string, props?: EventProperties) => client.capture(event, props ?? {}),
    };
    posthog.capture('$app_installed', { platform: Platform.OS });
  } catch {
    posthog = null;
  }
}

/** Send an event; never throws. */
export function track(event: AnalyticsEvent) {
  if (!enabled || !posthog) return;
  try {
    const { event: name, ...props } = event;
    posthog.capture(name, props);
  } catch {
    // Fire-and-forget: ignore analytics failures.
  }
}

/** Identify a (pseudo-)anonymous user for session stitching. */
export function identify(userId: string) {
  if (!enabled || !posthog) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (posthog as any).identify?.(userId);
  } catch {
    // ignore
  }
}