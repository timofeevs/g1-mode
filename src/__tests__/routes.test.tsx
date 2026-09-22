import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import HomeScreen from '@/app/index';
import PracticeScreen from '@/app/practice';
import ProfileScreen from '@/app/profile';
import ReviewScreen from '@/app/review';
import SimulationScreen from '@/app/simulation';
import { setDatabase, type SqliteBindValue, type SqliteHandle } from '@/services/storage';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSubscription } from '@/store/useSubscription';

/**
 * Route smoke tests.
 *
 * The engine, content bank and stores were already covered; what was missing was
 * any proof that the *routes* render the product rather than the Expo starter
 * demo they were scaffolded from. Each test mounts a real screen against a real
 * in-memory database and asserts on copy only this app has, so a regression back
 * to a placeholder page fails the suite instead of shipping.
 *
 * `expo-router`'s navigation hooks are mocked (there is no navigator mounted);
 * everything else is the production module graph.
 */

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn().mockResolvedValue(undefined),
}));

function toSqlInputValue(value: SqliteBindValue): SQLInputValue {
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

function makeHandle(): SqliteHandle {
  const native = new DatabaseSync(':memory:');
  return {
    execSync: (source: string) => native.exec(source),
    runSync: (source: string, ...params: SqliteBindValue[]) => {
      native.prepare(source).run(...params.map(toSqlInputValue));
    },
    getFirstSync: <T,>(source: string, ...params: SqliteBindValue[]): T | null => {
      const row = native.prepare(source).get(...params.map(toSqlInputValue));
      return (row === undefined ? null : row) as unknown as T;
    },
    getAllSync: <T,>(source: string, ...params: SqliteBindValue[]): T[] =>
      native.prepare(source).all(...params.map(toSqlInputValue)) as unknown as T[],
    closeSync: () => native.close(),
  };
}

/** Minimal safe-area metrics so `Screen` can read insets without a native host. */
const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 402, height: 874 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

function Wrapper({ children }: { children: ReactNode }) {
  return <SafeAreaProvider initialMetrics={METRICS}>{children}</SafeAreaProvider>;
}

beforeEach(() => {
  setDatabase(makeHandle());
  useAppStore.setState({ sessions: [], studyDays: [], streak: 0 });
  useAuthStore.setState({ userId: null, configured: false });
  useSubscription.setState({ isPremium: false, configured: false, busy: false, error: null });
});

afterEach(() => {
  setDatabase(null);
});

describe('route screens', () => {
  it('Home renders the readiness dashboard, not the Expo starter', async () => {
    const view = await render(<HomeScreen />, { wrapper: Wrapper });

    expect(view.getByText('G1 Mode')).toBeTruthy();
    expect(view.getByText('READINESS')).toBeTruthy();
    expect(view.getByText('Start a round')).toBeTruthy();
    expect(view.queryByText(/Welcome to Expo/i)).toBeNull();
    expect(view.queryByText(/Explore/i)).toBeNull();
  });

  it('Practice renders the round picker', async () => {
    const view = await render(<PracticeScreen />, { wrapper: Wrapper });

    expect(view.getByText('Practice')).toBeTruthy();
    expect(view.getByText('Start practice')).toBeTruthy();
  });

  it('Simulation renders the test-day briefing', async () => {
    const view = await render(<SimulationScreen />, { wrapper: Wrapper });

    expect(view.getByText('Full simulation')).toBeTruthy();
  });

  it('Review renders the empty-queue state before anything is scheduled', async () => {
    const view = await render(<ReviewScreen />, { wrapper: Wrapper });

    expect(view.getByText('Review')).toBeTruthy();
  });

  it('Profile renders the learner inventory and the handbook citation', async () => {
    const view = await render(<ProfileScreen />, { wrapper: Wrapper });

    expect(view.getByText('Profile')).toBeTruthy();
    expect(view.getByText('Your numbers')).toBeTruthy();
    expect(view.getByText('Where this comes from')).toBeTruthy();
    expect(view.getByText("MTO Driver's Handbook")).toBeTruthy();
  });
});
