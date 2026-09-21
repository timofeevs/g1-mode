import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { createCard, gradeCard } from '@/engine/spacedRepetition';
import {
  closeDb,
  getAllCards,
  getDueCards,
  getRecentSessions,
  getSetting,
  migrate,
  saveCard,
  saveSession,
  setDatabase,
  setSetting,
  type SqliteBindValue,
  type SqliteHandle,
} from '@/services/storage';

/**
 * Real-SQL storage tests.
 *
 * `expo-sqlite` has no in-memory backend under Jest, so we inject Node's
 * built-in `node:sqlite` (`DatabaseSync(':memory:')`) behind the same
 * `SqliteHandle` surface the storage module defines. Production and tests
 * therefore execute the *same* SQL text — only the driver differs.
 */

/** `expo-sqlite` can bind booleans; node:sqlite can't, so coerce them to 0/1. */
function toSqlInputValue(value: SqliteBindValue): SQLInputValue {
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

/** Adapter from node:sqlite to the storage module's synchronous handle. */
function makeHandle(): SqliteHandle {
  const native = new DatabaseSync(':memory:');
  return {
    execSync: (source: string) => {
      native.exec(source);
    },
    runSync: (source: string, ...params: SqliteBindValue[]) => {
      native.prepare(source).run(...params.map(toSqlInputValue));
    },
    getFirstSync: <T>(
      source: string,
      ...params: SqliteBindValue[]
    ): T | null => {
      const row = native.prepare(source).get(...params.map(toSqlInputValue));
      return (row === undefined ? null : row) as unknown as T;
    },
    getAllSync: <T>(source: string, ...params: SqliteBindValue[]): T[] => {
      return native.prepare(source).all(...params.map(toSqlInputValue)) as unknown as T[];
    },
    closeSync: () => {
      native.close();
    },
  };
}

beforeEach(() => {
  const handle = makeHandle();
  migrate(handle);
  setDatabase(handle);
});

afterEach(() => {
  closeDb();
});

describe('storage.cards', () => {
  it('persists a card and round-trips it', () => {
    const card = gradeCard(createCard('ontario::signs::q1'), 'good', 1_000_000_000_000);
    saveCard(card);

    const all = getAllCards();
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(card);
  });

  it('upserts by question id instead of duplicating', () => {
    const a = gradeCard(createCard('q1'), 'good', 1_000_000_000_000);
    const b = gradeCard(createCard('q1'), 'easy', 2_000_000_000_000);
    saveCard(a);
    saveCard(b);

    const all = getAllCards();
    expect(all).toHaveLength(1);
    expect(all[0].ease).toBe(b.ease);
    expect(all[0].interval).toBe(b.interval);
  });

  it('returns only due cards, soonest-due first', () => {
    const now = 1_000_000_000_000;
    // createCard(now) sets dueDate exactly to now.
    saveCard(createCard('due-now', now - 5000)); // already past due
    saveCard(createCard('due-later', now)); // due exactly at the query time
    saveCard(createCard('not-due', now + 86_400_000)); // due tomorrow

    const due = getDueCards(now + 60_000);
    expect(due.map((c) => c.questionId)).toEqual(['due-now', 'due-later']);
  });
});

describe('storage.sessions', () => {
  it('persists a session and reads it back most-recent-first', () => {
    saveSession('simulation', { correct: 38, passed: true, durationMs: 300_000, misses: ['q1'] });
    saveSession('practice', { correct: 9, passed: false, durationMs: 40_000, misses: ['q2', 'q3'] });

    const sessions = getRecentSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions[0].type).toBe('practice');
    expect(sessions[0].misses).toEqual(['q2', 'q3']);
    expect(sessions[1].scored).toBe(38);
    expect(sessions[1].passed).toBe(true);
  });

  it('filters to a single session type', () => {
    saveSession('simulation', { correct: 38, passed: true, durationMs: 300_000 });
    saveSession('practice', { correct: 9, passed: false, durationMs: 40_000 });

    const simulations = getRecentSessions(20, 'simulation');
    expect(simulations).toHaveLength(1);
    expect(simulations[0].type).toBe('simulation');
  });

  it('defaults misses to an empty list', () => {
    saveSession('simulation', { correct: 40, passed: true, durationMs: 200_000 });
    expect(getRecentSessions()[0].misses).toEqual([]);
  });
});

describe('storage.settings', () => {
  it('returns null for unset keys and round-trips set values', () => {
    expect(getSetting('testDate')).toBeNull();
    setSetting('testDate', '2026-12-01');
    expect(getSetting('testDate')).toBe('2026-12-01');
  });

  it('upserts an existing key', () => {
    setSetting('hapticsEnabled', 'true');
    setSetting('hapticsEnabled', 'false');
    expect(getSetting('hapticsEnabled')).toBe('false');
  });
});