import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import {
  closeDb,
  migrate,
  saveSession,
  setDatabase,
  setSetting,
  type SqliteBindValue,
  type SqliteHandle,
} from "@/services/storage";
import { DEFAULT_SETTINGS, useAppStore } from "@/store/useAppStore";

/** `expo-sqlite` can bind booleans; node:sqlite can't, so coerce them to 0/1. */
function toSqlInputValue(value: SqliteBindValue): SQLInputValue {
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

/** node:sqlite adapter matching the storage module's synchronous handle. */
function makeHandle(): SqliteHandle {
  const native = new DatabaseSync(":memory:");
  return {
    execSync: (source: string) => native.exec(source),
    runSync: (source: string, ...params: SqliteBindValue[]) =>
      native.prepare(source).run(...params.map(toSqlInputValue)),
    getFirstSync: <T>(
      source: string,
      ...params: SqliteBindValue[]
    ): T | null => {
      const row = native.prepare(source).get(...params.map(toSqlInputValue));
      return (row === undefined ? null : row) as unknown as T;
    },
    getAllSync: <T>(source: string, ...params: SqliteBindValue[]): T[] =>
      native
        .prepare(source)
        .all(...params.map(toSqlInputValue)) as unknown as T[],
    closeSync: () => native.close(),
  };
}

beforeEach(() => {
  const handle = makeHandle();
  migrate(handle);
  setDatabase(handle);
  useAppStore.setState({
    hydrated: false,
    sessions: [],
    studyDays: [],
    streak: 0,
    settings: { ...DEFAULT_SETTINGS },
  });
});

afterEach(() => {
  closeDb();
});

describe("useAppStore.hydrate", () => {
  it("loads sessions and the streak from SQLite", () => {
    saveSession("simulation", {
      correct: 40,
      passed: true,
      durationMs: 200_000,
    });
    saveSession("practice", { correct: 9, passed: false, durationMs: 30_000 });
    setSetting("testDate", "2026-12-01");

    useAppStore.getState().hydrate();

    const state = useAppStore.getState();
    expect(state.hydrated).toBe(true);
    expect(state.sessions).toHaveLength(2);
    expect(state.settings.testDate).toBe("2026-12-01");
    // Both sessions are from "today", so a streak of 2 would only hold if they
    // spanned two distinct local days; same-day sessions count as one study day.
    expect(state.streak).toBe(1);
  });

  it("keeps default settings when nothing is stored", () => {
    useAppStore.getState().hydrate();
    expect(useAppStore.getState().settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe("useAppStore.recordSession", () => {
  it("pushes a session into the mirror and persists it", () => {
    useAppStore.getState().recordSession("simulation", {
      correct: 38,
      passed: true,
      durationMs: 200_000,
      misses: ["q1"],
    });

    const state = useAppStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].type).toBe("simulation");
    expect(state.sessions[0].misses).toEqual(["q1"]);
    expect(state.streak).toBe(1);

    // And it landed in SQLite through the storage singleton.
    const { getRecentSessions } =
      require("@/services/storage") as typeof import("@/services/storage");
    expect(getRecentSessions()).toHaveLength(1);
    expect(getRecentSessions()[0].scored).toBe(38);
  });
});

describe("useAppStore.setSettings", () => {
  it("merges a partial patch", () => {
    useAppStore.getState().setSettings({ testDate: "2026-11-15" });
    expect(useAppStore.getState().settings.testDate).toBe("2026-11-15");
    expect(useAppStore.getState().settings.hapticsEnabled).toBe(true);
  });
});
