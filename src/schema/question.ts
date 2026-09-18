import { z } from 'zod';

/**
 * The content contract.
 *
 * Question banks are *data, not code* (build plan §5): they live in versioned
 * JSON, are validated by Zod at load time and in CI, and can be swapped per
 * province fork without touching a single component.
 *
 * Keep this file dependency-free (zod only) so `scripts/validate-questions.mjs`
 * and future build tooling can share the exact same contract as the app.
 */

/** The two scored sections of the Ontario G1 knowledge test. */
export const questionCategorySchema = z.enum(['signs', 'rules']);
export type QuestionCategory = z.infer<typeof questionCategorySchema>;

/**
 * Difficulty drives SM-2 seed intervals (see `engine/spacedRepetition.ts`) and
 * how aggressively the sampler favours a card in practice mode.
 */
export const difficultySchema = z.enum(['easy', 'medium', 'hard']);
export type Difficulty = z.infer<typeof difficultySchema>;

/**
 * Subcategory is a stable slug used for the "weakest area" breakdown on the
 * profile screen and for topic-filtered practice. Slugs are province-agnostic
 * where possible so the fork inherits the same UI groupings.
 */
export const subcategorySchema = z.enum([
  // signs
  'regulatory',
  'warning',
  'temporary-conditions',
  'information-direction',
  'sign-shapes',
  'traffic-lights',
  'pedestrian-signals',
  'pavement-markings',
  // rules
  'getting-ready',
  'driving-along',
  'sharing-the-road',
  'intersections',
  'stopping',
  'changing-directions',
  'changing-positions',
  'parking',
  'freeway-driving',
  'special-situations',
  'night-and-weather',
  'emergencies',
  'efficient-driving',
  'licensing',
]);
export type Subcategory = z.infer<typeof subcategorySchema>;

/** Exactly four options is the real-test format; enforced at the type level. */
export const optionsSchema = z.tuple([z.string(), z.string(), z.string(), z.string()]);

export const questionSchema = z
  .object({
    /** Stable, human-readable slug. Never reuse an ID for different content. */
    id: z
      .string()
      .min(3)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id must be a lowercase kebab-case slug'),
    category: questionCategorySchema,
    subcategory: subcategorySchema,
    difficulty: difficultySchema,
    /** Question prompt as shown to the learner. */
    text: z.string().min(10).max(400),
    /**
     * Optional asset key resolved against bundled images, e.g. `signs/stop`.
     * Sign-recognition questions are richer with an image; until the asset
     * pack ships, signs are described in `text` instead.
     */
    image: z.string().min(1).optional(),
    options: optionsSchema,
    /** Index into `options` of the single correct answer. */
    correctIndex: z.number().int().min(0).max(3),
    /** Shown immediately after answering — the teaching moment. */
    explanation: z.string().min(20).max(600),
    /** Where this is grounded in the MTO Driver's Handbook. */
    handbookRef: z.string().min(3),
    /** Available to free users. Free tier exposes ~50 curated questions. */
    isFree: z.boolean().default(false),
  })
  .strict()
  .superRefine((question, ctx) => {
    // A question with duplicate options is almost always an authoring mistake,
    // and it makes the "correct answer" ambiguous after shuffling.
    const seen = new Set<string>();
    for (const option of question.options) {
      const key = option.trim().toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['options'],
          message: `duplicate option text: "${option}"`,
        });
      }
      seen.add(key);
    }
  });

export type Question = z.infer<typeof questionSchema>;

/** Minimal shape shared by every province bank. */
export const questionBankSchema = z.object({
  /** Bank version — bump on any content change; mirrored by the filename. */
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** ISO date of the last human verification pass. */
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Which province/region the content is written for. */
  region: z.string().min(2),
  /** Handbook edition the content was checked against. */
  handbookEdition: z.string().min(2),
  questions: z.array(questionSchema).min(1),
});

export type QuestionBank = z.infer<typeof questionBankSchema>;