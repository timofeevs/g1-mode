import { z } from 'zod';

import { questionBankSchema } from '@/schema/question';

/**
 * Region configuration contract.
 *
 * This is the seam that makes a province fork a data swap (build plan §3): the
 * engine reads `testFormat` at runtime and never hardcodes "40 questions" or
 * "16 to pass". A BC fork ships `{ total: 50, split: { signs: 25, rules: 25 },
 * passPerSection: 25 }` and every screen follows automatically.
 */

export const testFormatSchema = z
  .object({
    /** Total questions in a full simulation. */
    total: z.number().int().positive(),
    /** How those questions split across the two scored sections. */
    split: z.object({
      signs: z.number().int().positive(),
      rules: z.number().int().positive(),
    }),
    /** Correct answers required *in each section* to pass. */
    passPerSection: z.number().int().positive(),
    /** Practice session lengths offered in the UI. */
    practiceLengths: z.array(z.number().int().positive()).min(1),
    /** Target bank size; drives the content-progress indicator. */
    bankTarget: z.number().int().positive(),
  })
  .superRefine((format, ctx) => {
    if (format.split.signs + format.split.rules !== format.total) {
      ctx.addIssue({
        code: 'custom',
        path: ['total'],
        message: 'total must equal split.signs + split.rules',
      });
    }
    // The real test requires 80% per section; guard against a config that would
    // silently mis-score a simulation.
    for (const section of ['signs', 'rules'] as const) {
      if (format.passPerSection > format.split[section]) {
        ctx.addIssue({
          code: 'custom',
          path: ['passPerSection'],
          message: `passPerSection cannot exceed the number of ${section} questions`,
        });
      }
    }
    if (!format.practiceLengths.includes(format.total)) {
      ctx.addIssue({
        code: 'custom',
        path: ['practiceLengths'],
        message: 'practiceLengths should include the full test length',
      });
    }
  });

export type TestFormat = z.infer<typeof testFormatSchema>;

/**
 * Store product identifiers. Prices live in the stores, never in code — these
 * are only keys passed to RevenueCat.
 */
export const productsSchema = z.object({
  monthly: z.string().min(1),
  quarterly: z.string().min(1),
  lifetime: z.string().min(1),
});

export type Products = z.infer<typeof productsSchema>;

/** Free-tier limits; premium removes them entirely. */
export const freeTierSchema = z.object({
  /** Practice questions answerable per day. */
  practicePerDay: z.number().int().positive(),
  /** Full simulations allowed per day. */
  simulationsPerDay: z.number().int().positive(),
  /** Whether spaced-repetition review is available without premium. */
  spacedRepetition: z.boolean(),
});

export type FreeTier = z.infer<typeof freeTierSchema>;

export const regionConfigSchema = z.object({
  /** Stable slug, e.g. `ontario`. */
  id: z.string().min(2),
  /** Display name used in copy, e.g. `Ontario`. */
  name: z.string().min(2),
  /** The licensing stage this app prepares for, e.g. `G1`. */
  licenceStage: z.string().min(1),
  /** App/Store display name, e.g. `G1 Mode`. */
  appName: z.string().min(2),
  /** One-line positioning used on the home screen and paywall. */
  tagline: z.string().min(4),
  /** Authority that administers the test, e.g. `MTO`. */
  authority: z.string().min(2),
  /** Canonical handbook URL shown in the profile/sources screen. */
  handbookUrl: z.string().url(),
  /** Handbook edition the bank was verified against. */
  handbookEdition: z.string().min(2),
  testFormat: testFormatSchema,
  productsSchema: productsSchema.optional(),
  freeTier: freeTierSchema,
  /** RevenueCat entitlement identifier that unlocks premium. */
  entitlementId: z.string().min(1),
  /** Bundled question bank, validated by the same schema the app uses. */
  bank: questionBankSchema,
});

export type RegionConfig = z.infer<typeof regionConfigSchema>;