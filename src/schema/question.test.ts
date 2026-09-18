import { questionBankSchema, questionSchema } from '@/schema/question';

/**
 * Unit tests for the content contract itself.
 *
 * These pin the authoring rules the bank is written against, so a schema change
 * that would silently start accepting broken content fails here first.
 */

const valid = {
  id: 'signs-example',
  category: 'signs',
  subcategory: 'warning',
  difficulty: 'easy',
  text: 'A yellow diamond sign tells you that:',
  options: ['A hazard is ahead', 'The speed limit is 50', 'You must stop', 'Parking is allowed'],
  correctIndex: 0,
  explanation:
    'Yellow diamonds are warning signs: they alert you to a dangerous or unusual condition ahead.',
  handbookRef: 'Traffic Signs and Lights > Signs',
};

describe('questionSchema', () => {
  it('accepts a well-formed question and defaults isFree to false', () => {
    const parsed = questionSchema.parse(valid);
    expect(parsed.isFree).toBe(false);
    expect(parsed.options).toHaveLength(4);
  });

  it('requires exactly four options', () => {
    const threeOptions = { ...valid, options: ['One', 'Two', 'Three'], correctIndex: 0 };
    const fiveOptions = { ...valid, options: ['One', 'Two', 'Three', 'Four', 'Five'] };
    expect(questionSchema.safeParse(threeOptions).success).toBe(false);
    expect(questionSchema.safeParse(fiveOptions).success).toBe(false);
  });

  it('rejects duplicate options, which make the answer ambiguous after shuffling', () => {
    const duplicate = {
      ...valid,
      options: ['Yield to traffic', 'Yield to traffic', 'Stop', 'Proceed'],
    };
    const result = questionSchema.safeParse(duplicate);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toMatch(
        /duplicate option text/i,
      );
    }
  });

  it('rejects an id that is not a lowercase kebab-case slug', () => {
    expect(questionSchema.safeParse({ ...valid, id: 'Signs Example' }).success).toBe(false);
    expect(questionSchema.safeParse({ ...valid, id: 'signs_example' }).success).toBe(false);
  });

  it('rejects an out-of-range correctIndex', () => {
    expect(questionSchema.safeParse({ ...valid, correctIndex: 4 }).success).toBe(false);
    expect(questionSchema.safeParse({ ...valid, correctIndex: -1 }).success).toBe(false);
  });

  it('rejects an unknown subcategory so the weakest-area breakdown stays intact', () => {
    expect(questionSchema.safeParse({ ...valid, subcategory: 'signs-and-stuff' }).success).toBe(
      false,
    );
  });

  it('rejects unknown keys rather than silently dropping authoring typos', () => {
    expect(questionSchema.safeParse({ ...valid, explaination: 'typo' }).success).toBe(false);
  });

  it('demands a real explanation, not a restatement stub', () => {
    expect(questionSchema.safeParse({ ...valid, explanation: 'Because.' }).success).toBe(false);
    expect(questionSchema.safeParse({ ...valid, handbookRef: '' }).success).toBe(false);
  });
});

describe('questionBankSchema', () => {
  it('accepts a minimal well-formed bank', () => {
    const bank = {
      version: '1.0.0',
      verifiedAt: '2026-09-17',
      region: 'ontario',
      handbookEdition: '2026 interim update',
      questions: [valid],
    };
    expect(questionBankSchema.parse(bank).questions).toHaveLength(1);
  });

  it('rejects a malformed version or verification date', () => {
    const base = {
      version: '1.0.0',
      verifiedAt: '2026-09-17',
      region: 'ontario',
      handbookEdition: '2026 interim update',
      questions: [valid],
    };
    expect(questionBankSchema.safeParse({ ...base, version: 'v1' }).success).toBe(false);
    expect(questionBankSchema.safeParse({ ...base, verifiedAt: '17/09/2026' }).success).toBe(false);
  });

  it('refuses an empty bank', () => {
    const empty = {
      version: '1.0.0',
      verifiedAt: '2026-09-17',
      region: 'ontario',
      handbookEdition: '2026 interim update',
      questions: [],
    };
    expect(questionBankSchema.safeParse(empty).success).toBe(false);
  });
});