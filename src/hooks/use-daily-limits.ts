import { useCallback, useState } from 'react';

import {
  dailyKey,
  parseUsage,
  practiceUsageKey,
  remainingPractice,
  remainingSimulations,
  simulationUsageKey,
} from '@/engine/freeTier';
import { freeTier } from '@/content/ontario';

/**
 * Free-tier usage for today (build plan §2, §3.3).
 *
 * The arithmetic lives in `@/engine/freeTier`; this hook is only the SQLite
 * read/write plus the React state that keeps the counters live after a round
 * finishes. The cap is per *local calendar day*, so the stored key carries the
 * date and yesterday's counters simply stop matching — no nightly reset job.
 *
 * A storage failure (web, or a first launch before the database exists) must
 * never lock a learner out, so every read degrades to "nothing used yet".
 */

function storageModule() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/services/storage') as typeof import('@/services/storage');
}

function readUsage(key: string): number {
  try {
    return parseUsage(storageModule().getSetting(key));
  } catch {
    return 0;
  }
}

function writeUsage(key: string, value: number) {
  try {
    storageModule().setSetting(key, String(value));
  } catch {
    // Usage tracking is an enhancement; never block a round over it.
  }
}

export type DailyLimits = {
  /** Local yyyy-mm-dd the counters below belong to. */
  day: string;
  /** Practice questions answered today. */
  practiceUsed: number;
  /** Full simulations started today. */
  simulationsUsed: number;
  /** Practice questions still allowed today. */
  practiceRemaining: number;
  /** Simulations still allowed today. */
  simulationsRemaining: number;
  /** Add answered questions to today's practice counter. */
  recordPractice: (questions: number) => void;
  /** Count one full simulation against today. */
  recordSimulation: () => void;
};

export function useDailyLimits(): DailyLimits {
  const [day] = useState(() => dailyKey());
  const [practiceUsed, setPracticeUsed] = useState(() => readUsage(practiceUsageKey()));
  const [simulationsUsed, setSimulationsUsed] = useState(() => readUsage(simulationUsageKey()));

  const recordPractice = useCallback(
    (questions: number) => {
      setPracticeUsed((current) => {
        const next = current + Math.max(0, questions);
        writeUsage(practiceUsageKey(), next);
        return next;
      });
    },
    [],
  );

  const recordSimulation = useCallback(() => {
    setSimulationsUsed((current) => {
      const next = current + 1;
      writeUsage(simulationUsageKey(), next);
      return next;
    });
  }, []);

  return {
    day,
    practiceUsed,
    simulationsUsed,
    practiceRemaining: remainingPractice(practiceUsed, freeTier),
    simulationsRemaining: remainingSimulations(simulationsUsed, freeTier),
    recordPractice,
    recordSimulation,
  };
}
