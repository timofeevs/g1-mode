import { readFileSync } from 'node:fs';
import path from 'node:path';

import { region, testFormat } from '@/content/ontario';
import {
  ONTARIO_BANK_VERSION,
  ONTARIO_HANDBOOK_EDITION,
  ontarioBank,
  ontarioQuestions,
} from '@/content/ontario/questions';
import { signsQuestions } from '@/content/ontario/signs';

/**
 * Tests for the shipped Ontario bank.
 *
 * The bank is data, so the "unit under test" is its integrity: if a learner can
 * ever be shown a question with two right answers, a missing explanation or a
 * handbook reference that does not exist, these tests should be what fails.
 */

describe('Ontario bank assembly', () => {
  it('is exactly the concatenation of its section files', () => {
    expect(ontarioQuestions).toEqual([...signsQuestions]);
    expect(ontarioBank.questions).toEqual(ontarioQuestions);
  });

  it('reports verifiable version metadata', () => {
    expect(ontarioBank.version).toBe(ONTARIO_BANK_VERSION);
    expect(ontarioBank.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(ontarioBank.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ontarioBank.region).toBe('ontario');
    expect(ontarioBank.handbookEdition).toBe(ONTARIO_HANDBOOK_EDITION);
    // The region config and the bank must never advertise different editions.
    expect(region.handbookEdition).toBe(ONTARIO_HANDBOOK_EDITION);
  });

  it('has unique, category-prefixed ids', () => {
    const ids = ontarioQuestions.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const question of ontarioQuestions) {
      expect(question.id.startsWith(`${question.category}-`)).toBe(true);
    }
  });

  it('gives every question four distinct options and an in-range answer', () => {
    for (const question of ontarioQuestions) {
      expect(question.options).toHaveLength(4);
      const normalised = question.options.map((option) => option.trim().toLowerCase());
      expect(new Set(normalised).size).toBe(4);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(4);
    }
  });

  it('explains every answer instead of restating it', () => {
    for (const question of ontarioQuestions) {
      expect(question.explanation.length).toBeGreaterThanOrEqual(20);
      expect(question.explanation.trim()).not.toBe(question.options[question.correctIndex].trim());
    }
  });

  it('grounds every question in a heading that exists in the handbook', () => {
    const handbook = readFileSync(
      path.join(__dirname, '..', '..', '..', 'mto-drivers-handbook.md'),
      'utf8',
    );
    for (const question of ontarioQuestions) {
      const chapter = question.handbookRef.split('>')[0].trim();
      expect(chapter.length).toBeGreaterThan(0);
      expect(handbook).toContain(chapter);
    }
  });

  it('can fill a full simulation for every section that has been authored', () => {
    for (const section of Object.keys(testFormat.split) as (keyof typeof testFormat.split)[]) {
      const inSection = ontarioQuestions.filter((question) => question.category === section);
      // The rules section ships in a later content wave; `npm run
      // validate:questions` is the gate that must be green before release.
      if (inSection.length === 0) continue;
      expect(inSection.length).toBeGreaterThanOrEqual(testFormat.split[section]);
    }
  });

  it('offers enough free questions for one practice session', () => {
    const free = ontarioQuestions.filter((question) => question.isFree);
    expect(free.length).toBeGreaterThanOrEqual(region.freeTier.practicePerDay);
  });

  it('spreads difficulty so spaced repetition has something to schedule', () => {
    const difficulties = new Set(ontarioQuestions.map((question) => question.difficulty));
    expect(difficulties).toEqual(new Set(['easy', 'medium', 'hard']));
  });

  it('wires the store products and entitlement the paywall reads', () => {
    expect(region.entitlementId).toBe('premium');
    expect(region.productsSchema).toBeDefined();
    const ids = Object.values(region.productsSchema ?? {});
    expect(ids).toHaveLength(3);
    for (const id of ids) expect(typeof id).toBe('string');
    for (const id of ids) expect(id.length).toBeGreaterThan(0);
  });
});