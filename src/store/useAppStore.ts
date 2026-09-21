import { create } from 'zustand';

import { type StoredSession, type SessionType } from '@/services/storage';

/**
 * App-wide client state (build plan §2.5, §3 store).
 *
 * The heavy data (cards, sessions) lives in SQLite; this store holds the
 * in-memory mirrors screens read every render plus lightweight settings.
 * Everything is hydrated from SQLite on launch (`hydrateFromStorage`).
 *
 * Streaks: a "study day" is any day with at least one answered question.
 * The streak is the number of consecutive study days ending today (or
 * yesterday, so a user who studies late at night doesn't lose their streak).
 */

/** Local calendar-day key (yyyy-mm-dd); streaks follow the learner's clock. */
function dayKey(ts: number): string {
  const d = new Date(ts);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export type AppSettings = {
  /** Haptic feedback toggle. */
  hapticsEnabled: boolean;
  /** Show the countdown to a test date on the home screen. */
  testDateEnabled: boolean;
  /** ISO date string (yyyy-mm-dd) of the user's booked G1 test. */
  testDate: string | null;
};

export const DEFAULT_SETTINGS: AppSettings = {
  hapticsEnabled: true,
  testDateEnabled: false,
  testDate: null,
};

type AppState = {
  /** Have we hydrated from SQLite at least once? */
  hydrated: boolean;

  settings: AppSettings;
  setSettings: (patch: Partial<AppSettings>) => void;

  /** Recent sessions (most recent first), mirrored from SQLite. */
  sessions: StoredSession[];
  /** Sorted set of study-day keys, used to compute the streak. */
  studyDays: string[];

  /** Hydrate all mirrors from SQLite. */
  hydrate: () => void;
  /** Push a completed session into the mirrors + SQLite. */
  recordSession: (type: SessionType, result: { correct: number; passed: boolean; durationMs: number; misses?: string[] }) => void;

  /** Derived: current study streak in days. */
  streak: number;
};

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  settings: { ...DEFAULT_SETTINGS },
  setSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),

  sessions: [],
  studyDays: [],

  streak: 0,

  hydrate: () => {
    // Deferred requires keep this module import-safe on web/SSR where the
    // native SQLite store is a no-op.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const storage = require('@/services/storage') as typeof import('@/services/storage');

    const sessions = storage.getRecentSessions(50);

    // Build the study-day set from every session we have.
    const studyDays = new Set<string>();
    for (const session of sessions) {
      studyDays.add(dayKey(session.startedAt));
    }

    // A streak is consecutive study days ending today or yesterday.
    let cursor = new Date();
    if (!studyDays.has(dayKey(cursor.getTime()))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    let streak = 0;
    while (studyDays.has(dayKey(cursor.getTime()))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const storedTestDate = storage.getSetting('testDate');
    const storedTestDateEnabled = storage.getSetting('testDateEnabled');
    const storedHaptics = storage.getSetting('hapticsEnabled');

    set({
      hydrated: true,
      sessions,
      studyDays: [...studyDays].sort(),
      streak,
      settings: {
        hapticsEnabled: storedHaptics ? storedHaptics === 'true' : DEFAULT_SETTINGS.hapticsEnabled,
        testDateEnabled: storedTestDateEnabled
          ? storedTestDateEnabled === 'true'
          : DEFAULT_SETTINGS.testDateEnabled,
        testDate: storedTestDate ?? DEFAULT_SETTINGS.testDate,
      },
    });
  },

  recordSession: (type, result) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const storage = require('@/services/storage') as typeof import('@/services/storage');
    storage.saveSession(type, result);

    const sessions = storage.getRecentSessions(50);
    const studyDays = new Set(get().studyDays);
    studyDays.add(dayKey(Date.now()));

    // Recompute the streak from the updated day set.
    let cursor = new Date();
    if (!studyDays.has(dayKey(cursor.getTime()))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    let streak = 0;
    while (studyDays.has(dayKey(cursor.getTime()))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    set({ sessions, studyDays: [...studyDays].sort(), streak });
  },
}));

/** Persist a settings change to SQLite immediately (fire-and-forget). */
export function persistSettings(settings: AppSettings) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const storage = require('@/services/storage') as typeof import('@/services/storage');
  storage.setSetting('testDate', settings.testDate ?? '');
  storage.setSetting('testDateEnabled', String(settings.testDateEnabled));
  storage.setSetting('hapticsEnabled', String(settings.hapticsEnabled));
}

/** Convenience selector for screens that only read the streak. */
export const selectStreak = (state: AppState) => state.streak;
export const selectHydrated = (state: AppState) => state.hydrated;
