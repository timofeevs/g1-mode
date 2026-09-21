import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import type { CardState } from '@/engine/spacedRepetition';

/**
 * Local-first persistence (build plan §2.1, §5).
 *
 * Everything a learner does that should survive a restart lives here, in the
 * tables the plan specifies:
 *  - `cards(questionId PK, ease, interval, repetitions, dueDate, lapses)`
 *  - `sessions(id, startedAt, durationMs, type, scored, passed, missesJson)`
 *  - `settings(key PK, value)`
 *
 * The app talks to SQLite only through this module. `expo-sqlite`'s web build
 * is a no-op DOM store, so a `web` import of this module stays safe. The
 * synchronous surface is captured as `SqliteHandle` so tests can inject a real
 * in-memory database (`node:sqlite`) without mocking any SQL.
 */

export type SessionType = 'practice' | 'simulation';

/** Values the statement binders in this module actually use. */
export type SqliteBindValue = string | number | boolean | null;

/**
 * The minimal synchronous handle the storage layer touches. `SQLiteDatabase`
 * satisfies it structurally; `NodeSqliteDatabase` (tests) duplicates the four
 * methods, so production and tests run the *same* SQL text.
 */
export interface SqliteHandle {
  execSync(source: string): void;
  runSync(source: string, ...params: SqliteBindValue[]): void;
  getFirstSync<T>(source: string, ...params: SqliteBindValue[]): T | null;
  getAllSync<T>(source: string, ...params: SqliteBindValue[]): T[];
  closeSync(): void;
}

const SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS cards (
    question_id TEXT PRIMARY KEY NOT NULL,
    ease REAL NOT NULL,
    interval_days INTEGER NOT NULL,
    repetitions INTEGER NOT NULL,
    due_date INTEGER NOT NULL,
    lapses INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    type TEXT NOT NULL,
    scored INTEGER NOT NULL,
    passed INTEGER NOT NULL,
    misses_json TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`;

/** The app-wide database handle. */
let db: SqliteHandle | null = null;

/** Lazily open (and migrate) the database. */
export function getDb(): SqliteHandle {
  if (!db) {
    db = openDatabaseSync('g1-mode.db') as SqliteHandle;
    db.execSync(SCHEMA);
  }
  return db;
}

/** Test seam: replace the default database handle. */
export function setDatabase(handle: SqliteHandle | null) {
  db = handle;
}

export function closeDb() {
  if (db) {
    db.closeSync();
    db = null;
  }
}

/** Run the schema on a fresh handle (tests use their own in-memory db). */
export function migrate(db: SqliteHandle) {
  db.execSync(SCHEMA);
}

// --- cards ------------------------------------------------------------------

/** Upsert a scheduled card. */
export function saveCard(card: CardState) {
  const db = getDb();
  const {
    questionId,
    ease,
    interval,
    repetitions,
    dueDate,
    lapses,
  } = card;
  db.runSync(
    `INSERT INTO cards (question_id, ease, interval_days, repetitions, due_date, lapses)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(question_id) DO UPDATE SET
       ease = excluded.ease,
       interval_days = excluded.interval_days,
       repetitions = excluded.repetitions,
       due_date = excluded.due_date,
       lapses = excluded.lapses`,
    questionId,
    ease,
    interval,
    repetitions,
    dueDate,
    lapses,
  );
}

/** All persisted cards. */
export function getAllCards(): CardState[] {
  return getDb().getAllSync<{
    question_id: string;
    ease: number;
    interval_days: number;
    repetitions: number;
    due_date: number;
    lapses: number;
  }>('SELECT * FROM cards').map((row) => ({
    questionId: row.question_id,
    ease: row.ease,
    interval: row.interval_days,
    repetitions: row.repetitions,
    dueDate: row.due_date,
    lapses: row.lapses,
  }));
}

/** Cards whose due date has passed, most recently-due first. */
export function getDueCards(now: number = Date.now()): CardState[] {
  return getAllCards()
    .filter((card) => card.dueDate <= now)
    .sort((a, b) => a.dueDate - b.dueDate);
}

// --- sessions ---------------------------------------------------------------

export type StoredSession = {
  id: number;
  startedAt: number;
  durationMs: number;
  type: SessionType;
  scored: number;
  passed: boolean;
  misses: string[];
};

export function saveSession(
  type: SessionType,
  result: { correct: number; passed: boolean; durationMs: number; misses?: string[] },
) {
  const db = getDb();
  const misses = result.misses ?? [];
  db.runSync(
    `INSERT INTO sessions (started_at, duration_ms, type, scored, passed, misses_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    Date.now(),
    result.durationMs,
    type,
    result.correct,
    result.passed ? 1 : 0,
    JSON.stringify(misses),
  );
}

/** Most-recent-first session history (optionally only full simulations). */
export function getRecentSessions(limit = 20, type?: SessionType): StoredSession[] {
  const db = getDb();
  const rows = db.getAllSync<{
    id: number;
    started_at: number;
    duration_ms: number;
    type: SessionType;
    scored: number;
    passed: number;
    misses_json: string;
  }>(`SELECT * FROM sessions ${type ? 'WHERE type = ?' : ''} ORDER BY started_at DESC, id DESC LIMIT ?`,
    ...(type ? [type, limit] : [limit]),
  );
  return rows.map((row) => ({
    id: row.id,
    startedAt: row.started_at,
    durationMs: row.duration_ms,
    type: row.type,
    scored: row.scored,
    passed: row.passed === 1,
    misses: JSON.parse(row.misses_json ?? '[]') as string[],
  }));
}

// --- settings ---------------------------------------------------------------

export function getSetting(key: string): string | null {
  const row = getDb().getFirstSync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  getDb().runSync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}