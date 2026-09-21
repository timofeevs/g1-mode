import 'react-native-url-polyfill/auto';

import { Platform } from 'react-native';

/**
 * Supabase auth (build plan §2.5, §4.3, §7).
 *
 * Scaffolded for Phase B but intentionally dormant until configured: every
 * exported function is a safe no-op when `EXPO_PUBLIC_SUPABASE_URL` /
 * `EXPO_PUBLIC_SUPABASE_ANON_KEY` are missing (mirrors `analytics.ts`). This
 * keeps the app buildable and launchable in a clean checkout, before a real
 * Supabase project exists.
 *
 * Once configured it provides:
 *  - phone OTP sign-in (primary method for v1 — learners without a Google/Apple
 *    account, and the only option that works the same on both stores)
 *  - Google + Apple OAuth (build plan §4.3 "social login")
 *  - session restore on launch + sign-out
 *
 * Supabase is imported lazily so a missing/partial install can never crash
 * module load. `react-native-url-polyfill/auto` is required because Supabase's
 * fetch/URL assumptions target Node/browser; without it, deep-link redirects
 * from OAuth fail on Hermes.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True when a Supabase project is configured and the client can be built. */
export const isAuthConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

type SupabaseClient = {
  auth: {
    signInWithOtp: (args: { phone: string; options?: { shouldCreateUser?: boolean } }) => Promise<{
      data: unknown;
      error: { message: string } | null;
    }>;
    verifyOtp: (args: {
      phone: string;
      token: string;
      type: 'sms' | 'sms_verify' | 'phone_change';
    }) => Promise<{
      data: { session: unknown } | null;
      error: { message: string } | null;
    }>;
    signInWithOAuth: (args: { provider: 'google' | 'apple'; options?: { redirectTo?: string } }) => Promise<{
      data: unknown;
      error: { message: string } | null;
    }>;
    getSession: () => Promise<{
      data: { session: { user: { id: string; phone?: string | null } } | null };
      error: unknown;
    }>;
    signOut: () => Promise<{ error: unknown }>;
  };
};

let clientPromise: Promise<SupabaseClient | null> | null = null;

/**
 * Build the Supabase client once. Returns null (never throws) when unconfigured
 * or when the lazy import fails, so callers can treat it as optional.
 */
function getClient(): Promise<SupabaseClient | null> {
  if (!isAuthConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!) as SupabaseClient;
      } catch {
        return null;
      }
    })();
  }
  return clientPromise;
}

export type AuthResult =
  | { ok: true; session?: unknown }
  | { ok: false; error: string };

function toResult(
  outcome: { data: unknown; error: { message: string } | null },
  session?: unknown,
): AuthResult {
  if (outcome.error) return { ok: false, error: outcome.error.message };
  return { ok: true, session };
}

/**
 * Send a one-time passcode to a phone number (E.164, e.g. +14165551234).
 * Returns `{ok:false, error:"auth-not-configured"}` when Supabase is not set up.
 */
export async function sendPhoneOtp(phone: string): Promise<AuthResult> {
  const client = await getClient();
  if (!client) return { ok: false, error: 'auth-not-configured' };
  try {
    const res = await client.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true },
    });
    return toResult(res);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'phone-otp-failed' };
  }
}

/**
 * Verify the passcode the learner received by SMS. `type` should be `'sms'`
 * for a fresh sign-in (creating the user on first verify).
 */
export async function verifyPhoneOtp(phone: string, token: string): Promise<AuthResult> {
  const client = await getClient();
  if (!client) return { ok: false, error: 'auth-not-configured' };
  try {
    const res = await client.auth.verifyOtp({ phone, token, type: 'sms' });
    if (res.error) return { ok: false, error: res.error.message };
    return { ok: true, session: res.data?.session };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'verify-otp-failed' };
  }
}

/**
 * Open Google/Apple OAuth in a secure browser (SFSafariViewController /
 * Chrome Custom Tabs). On iOS/Android the Supabase session comes back through
 * the `g1mode://` deep link (see app.json scheme), so no redirectTo is needed
 * for native; web needs the current origin to complete the round-trip.
 */
export async function signInWithProvider(provider: 'google' | 'apple'): Promise<AuthResult> {
  const client = await getClient();
  if (!client) return { ok: false, error: 'auth-not-configured' };
  try {
    const options =
      Platform.OS === 'web'
        ? { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined }
        : undefined;
    const res = await client.auth.signInWithOAuth({ provider, options });
    return toResult(res);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'oauth-failed' };
  }
}

/**
 * Restore a persisted session at launch. Returns the user id when signed in,
 * or null. Never throws.
 */
export async function getCurrentSession(): Promise<{ userId: string | null; phone?: string | null }> {
  const client = await getClient();
  if (!client) return { userId: null };
  try {
    const { data } = await client.auth.getSession();
    const session = data.session;
    if (!session) return { userId: null };
    return { userId: session.user.id, phone: session.user.phone ?? null };
  } catch {
    return { userId: null };
  }
}

/** Sign the learner out. Fire-and-forget; never throws. */
export async function signOut(): Promise<void> {
  const client = await getClient();
  if (!client) return;
  try {
    await client.auth.signOut();
  } catch {
    // Sign-out is best-effort.
  }
}
