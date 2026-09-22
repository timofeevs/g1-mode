import { Platform } from 'react-native';

import { entitlementId } from '@/content/ontario';

/**
 * RevenueCat wrapper (build plan §3.1, §3.3, §7).
 *
 * Like `auth.ts`, this is deliberately dormant until configured: without
 * `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `..._ANDROID_KEY` every call is a safe
 * no-op and `isPurchasesConfigured` is false, so a clean checkout still builds
 * and runs. That also means the free tier is the *only* tier in a local build —
 * which is exactly what you want while the store products don't exist yet.
 *
 * The native module is required lazily for two reasons: it throws on web
 * (`react-native-purchases` has no web implementation), and a missing install
 * must never crash module load.
 */

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

/** The store SDK key for this platform, or undefined when unconfigured. */
function apiKey(): string | undefined {
  if (Platform.OS === 'ios') return IOS_KEY;
  if (Platform.OS === 'android') return ANDROID_KEY;
  return undefined;
}

export const isPurchasesConfigured = Boolean(IOS_KEY || ANDROID_KEY);

/** Minimal slice of the SDK this module touches. */
type PurchasesModule = {
  configure: (options: { apiKey: string }) => void;
  getCustomerInfo: () => Promise<{
    entitlements: { active: Record<string, unknown> };
  }>;
  getOfferings: () => Promise<{
    current: { availablePackages: { identifier: string }[] } | null;
  }>;
  purchasePackage: (pkg: unknown) => Promise<{
    customerInfo: { entitlements: { active: Record<string, unknown> } };
  }>;
  restorePurchases: () => Promise<{
    entitlements: { active: Record<string, unknown> };
  }>;
};

let cached: PurchasesModule | null | undefined;

/** Require the SDK once. Returns null on web, unconfigured or missing install. */
function sdk(): PurchasesModule | null {
  if (cached !== undefined) return cached;
  const key = apiKey();
  if (!key) {
    cached = null;
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require('react-native-purchases') as {
      default?: PurchasesModule;
    } & PurchasesModule;
    const resolved = (module.default ?? module) as PurchasesModule;
    resolved.configure({ apiKey: key });
    cached = resolved;
  } catch {
    cached = null;
  }
  return cached;
}

export type PremiumStatus = 'premium' | 'free' | 'unknown';

/** Read the current entitlement. `unknown` means we could not ask (offline). */
export async function getPremiumStatus(): Promise<PremiumStatus> {
  const purchases = sdk();
  if (!purchases) return 'free';
  try {
    const info = await purchases.getCustomerInfo();
    return info.entitlements.active[entitlementId] ? 'premium' : 'free';
  } catch {
    return 'unknown';
  }
}

export type PurchaseResult =
  | { ok: true; status: PremiumStatus }
  | { ok: false; error: string; cancelled?: boolean };

/** Buy the package with this identifier (a store product id from the region). */
export async function purchase(productId: string): Promise<PurchaseResult> {
  const purchases = sdk();
  if (!purchases) return { ok: false, error: 'purchases-not-configured' };
  try {
    const offerings = await purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      (candidate) => candidate.identifier === productId,
    );
    if (!pkg) return { ok: false, error: 'product-unavailable' };
    const { customerInfo } = await purchases.purchasePackage(pkg);
    return {
      ok: true,
      status: customerInfo.entitlements.active[entitlementId] ? 'premium' : 'free',
    };
  } catch (e) {
    // The SDK signals a user-initiated cancel as an error; that is not a failure
    // worth alarming anyone about, so it gets its own flag.
    const cancelled = typeof e === 'object' && e !== null && 'userCancelled' in e;
    return {
      ok: false,
      cancelled: Boolean(cancelled),
      error: e instanceof Error ? e.message : 'purchase-failed',
    };
  }
}

/** Restore previous purchases (required by both stores). */
export async function restore(): Promise<PurchaseResult> {
  const purchases = sdk();
  if (!purchases) return { ok: false, error: 'purchases-not-configured' };
  try {
    const info = await purchases.restorePurchases();
    return {
      ok: true,
      status: info.entitlements.active[entitlementId] ? 'premium' : 'free',
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'restore-failed' };
  }
}
