import { create } from 'zustand';

import { isAuthConfigured } from '@/services/auth';

/**
 * Auth client state (build plan §2.5, §4.3).
 *
 * Scaffolded for Phase B. Like `useAppStore`, this is the in-memory mirror
 * screens read every render; the durable session itself lives with Supabase
 * (persisted to secure storage by the Supabase client), not in SQLite.
 *
 * Until `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set,
 * `configured` is false and `restoreSession` resolves immediately with the
 * user still signed out — so an unconfigured build is indistinguishable from
 * an actual sign-out and nothing breaks.
 */

type AuthState = {
  /** Is a Supabase project configured (i.e. could a real session exist)? */
  configured: boolean;
  /** Restore-complete guard, so the app can gate on auth before first paint. */
  hydrated: boolean;
  /** Current signed-in user id, or null. */
  userId: string | null;
  /** Phone number the learner verified with (when using phone OTP). */
  phone: string | null;
  /** True while an auth call is in flight (for loading spinners). */
  busy: boolean;
  /** Last error message from an auth action, or null. */
  error: string | null;

  /** Restore the persisted Supabase session on launch. */
  restoreSession: () => Promise<void>;
  /** Sign out (Supabase + mirror state). */
  clearSession: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  configured: isAuthConfigured,
  hydrated: false,
  userId: null,
  phone: null,
  busy: false,
  error: null,

  restoreSession: async () => {
    set({ busy: true, error: null });
    try {
      if (!isAuthConfigured) {
        set({ hydrated: true, busy: false });
        return;
      }
      // Deferred require keeps this module import-safe on web/SSR where the
      // Supabase client may not be initialised.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const auth = require('@/services/auth') as typeof import('@/services/auth');
      const session = await auth.getCurrentSession();
      set({ userId: session.userId, phone: session.phone ?? null });
    } finally {
      set({ hydrated: true, busy: false });
    }
  },

  clearSession: async () => {
    set({ busy: true, error: null });
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const auth = require('@/services/auth') as typeof import('@/services/auth');
      await auth.signOut();
    } finally {
      set({ userId: null, phone: null, hydrated: true, busy: false });
    }
  },
}));

/** Convenience selectors for screens. */
export const selectUserId = (state: AuthState) => state.userId;
export const selectAuthHydrated = (state: AuthState) => state.hydrated;
export const selectAuthConfigured = (state: AuthState) => state.configured;
