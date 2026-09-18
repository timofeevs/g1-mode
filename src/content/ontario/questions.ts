import { signsQuestions } from '@/content/ontario/signs';
import { questionBankSchema, type Question, type QuestionBank } from '@/schema/question';

/**
 * The Ontario bank, assembled one file per scored section.
 *
 * `index.ts` imports *this* module, so every question the app can ever serve
 * passes the same Zod parse that CI runs — a section file imported straight
 * from a screen would bypass that gate.
 *
 * Sections arrive in waves (build plan §1.2 targets ~450 questions):
 *  - `signs.ts` — "Traffic Signs and Lights" (38 written)
 *  - `rules.ts` — rules of the road and safe driving practices (next wave)
 */

/** Bank version — bump on any content change. */
export const ONTARIO_BANK_VERSION = '1.1.0';

/** ISO date of the last human verification pass against the handbook. */
export const ONTARIO_BANK_VERIFIED_AT = '2026-09-17';

/**
 * Handbook edition every `handbookRef` was checked against. Shared with the
 * region config so the two can never disagree on the sources screen.
 */
export const ONTARIO_HANDBOOK_EDITION = '2026 interim update';

/** Every question in the bank, in section order. */
export const ontarioQuestions: Question[] = [...signsQuestions];

/**
 * Parsed at module load: a three-option question, a duplicate slug or a missing
 * explanation throws here rather than reaching a learner mid-test.
 */
export const ontarioBank: QuestionBank = questionBankSchema.parse({
  version: ONTARIO_BANK_VERSION,
  verifiedAt: ONTARIO_BANK_VERIFIED_AT,
  region: 'ontario',
  handbookEdition: ONTARIO_HANDBOOK_EDITION,
  questions: ontarioQuestions,
});