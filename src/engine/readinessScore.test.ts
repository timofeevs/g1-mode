import { bandForScore, readinessCopy, readinessScore, type ReadinessBand } from '@/engine/readinessScore';
import type { SimulationResult } from '@/engine/session';

function sim(passed: boolean, correct = 30): SimulationResult {
  return {
    sections: [],
    total: 40,
    correct,
    passed,
    durationMs: 300_000,
    misses: [],
  };
}

describe('readinessScore', () => {
  it('returns 0 with no simulation history', () => {
    expect(readinessScore([])).toBe(0);
  });

  it('scores 100 when every recent simulation passed', () => {
    expect(readinessScore([sim(true), sim(true), sim(true)])).toBe(100);
  });

  it('weights the most recent simulation most heavily', () => {
    // Most recent: passed (100), older two: barely failed (72). Weighted avg
    // leans toward the pass.
    const score = readinessScore([sim(true), sim(false, 29), sim(false, 29)]);
    expect(score).toBeGreaterThan(80);
    const reversed = readinessScore([sim(false, 29), sim(false, 29), sim(true)]);
    expect(reversed).toBeLessThan(score);
  });

  it('treats missing history as zero weight', () => {
    const one = readinessScore([sim(true)]);
    const three = readinessScore([sim(true), sim(true), sim(true)]);
    expect(one).toBe(100);
    expect(three).toBe(100);
  });
});

describe('bandForScore', () => {
  it('maps scores to the documented bands', () => {
    expect(bandForScore(60)).toBe('low');
    expect(bandForScore(70)).toBe('building');
    expect(bandForScore(85)).toBe('ready');
    expect(bandForScore(100)).toBe('ready');
  });
});

describe('readinessCopy', () => {
  it('returns copy for every band', () => {
    for (const band of ['low', 'building', 'ready'] as ReadinessBand[]) {
      expect(readinessCopy(band).length).toBeGreaterThan(0);
    }
  });
});