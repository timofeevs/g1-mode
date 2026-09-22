import { create } from 'zustand';

import { isPurchasesConfigured } from '@/services/revenuecat';

/**
 * Premium entitlement state (build plan §3.3).
 *
 * A thin mirror over RevenueCat, in the same shape as `useAuthStore`: screens
 * read `isPremium` on every render, and the store owns the async round-trips.
 *
 * `isPremium` defaults to false and stays false in an unconfigured build, which
 * is the safe direction — the free tier is always fully usable, so a learner
 * with no store account never hits a dead end. `refresh()` is called on launch
 * and after a purchase/restore, and it never throws.
 */

type SubscriptionState = {
  /** Is a RevenueCat project configured (i.e. could a purchase exist)? */
  configured: boolean;
  /** True while a purchase/restore/refresh is in flight. */
  busy: boolean;
  /** Whether the premium entitlement is currently active. */
  isPremium: boolean;
  /** Last error from a purchase or restore, or null. */
  error: string | null;
  /** True when the learner backed out of the store sheet. */
  cancelled: boolean;

  /** Re-read the entitlement (launch, after purchase, after restore). */
  refresh: () => Promise<void>;
  /** Buy a store product id (from `products` in the region config). */
  buy: (productId: string) => Promise<void>;
  /** Restore previous purchases. */
  restorePurchases: () => Promise<void>;
};

export const useSubscription = create<SubscriptionState>((set) => ({
  configured: isPurchasesConfigured,
  busy: false,
  isPremium: false,
  error: null,
  cancelled: false,

  refresh: async () => {
    if (!isPurchasesConfigured) return;
    set({ busy: true, error: null });
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const rc = require('@/services/revenuecat') as typeof import('@/services/revenuecat');
      const status = await rc.getPremiumStatus();
      // `unknown` (offline) must not silently downgrade a paying learner.
      if (status !== 'unknown') set({ isPremium: status === 'premium' });
    } finally {
      set({ busy: false });
    }
  },

  buy: async (productId) => {
    set({ busy: true, error: null, cancelled: false });
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const rc = require('@/services/revenuecat') as typeof import('@/services/revenuecat');
      const result = await rc.purchase(productId);
      if (result.ok) {
        set({ isPremium: result.status === 'premium' });
        return;
      }
      if (!result.cancelled) set({ error: result.error });
      set({ cancelled: Boolean(result.cancelled) });
    } finally {
      set({ busy: false });
    }
  },

  restorePurchases: async () => {
    set({ busy: true, error: null, cancelled: false });
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const rc = require('@/services/revenuecat') as typeof import('@/services/revenuecat');
      const result = await rc.restore();
      if (result.ok) {
        set({ isPremium: result.status === 'premium' });
        return;
      }
      set({ error: result.error });
    } finally {
      set({ busy: false });
    }
  },
}));

/** Convenience selectors for screens. */
export const selectIsPremium = (state: SubscriptionState) => state.isPremium;
export const selectSubscriptionBusy = (state: SubscriptionState) => state.busy;
