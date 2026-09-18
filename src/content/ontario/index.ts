import { regionConfigSchema, type RegionConfig } from '@/schema/region';
import { ONTARIO_HANDBOOK_EDITION, ontarioBank } from '@/content/ontario/questions';

/**
 * The Ontario G1 build.
 *
 * This app is Ontario-only by design. Later provinces are *forks* of this
 * repository (one province = one app, one store listing), not runtime modes —
 * so everything province-specific funnels through this single config object.
 * See build plan §3.
 */
const ontario = {
  id: 'ontario',
  name: 'Ontario',
  licenceStage: 'G1',
  appName: 'G1 Mode',
  tagline: 'Pass the Ontario G1 test the first time.',
  authority: 'MTO',
  handbookUrl: 'https://www.ontario.ca/document/official-mto-drivers-handbook',
  handbookEdition: ONTARIO_HANDBOOK_EDITION,

  /**
   * Verified against the MTO Driver's Handbook: 40 questions, split 20 road
   * signs + 20 rules of the road, and 16/20 in *each* section to pass (80%).
   */
  testFormat: {
    total: 40,
    split: { signs: 20, rules: 20 },
    passPerSection: 16,
    practiceLengths: [10, 20, 40],
    bankTarget: 450,
  },

  /**
   * 1-month anchor is the primary plan (build plan §2). The key is spelled the
   * way `regionConfigSchema` declares it; consumers read the friendlier
   * `products` re-export below, so screens never learn the schema's spelling.
   */
  productsSchema: {
    monthly: 'onemonth_9.99',
    quarterly: 'threemonths_19.99',
    lifetime: 'lifetime_24.99',
  },

  /** Free tier: a taste, then the paywall. */
  freeTier: {
    practicePerDay: 10,
    simulationsPerDay: 1,
    spacedRepetition: false,
  },

  /** Single RevenueCat entitlement shared by every product. */
  entitlementId: 'premium',

  bank: ontarioBank,
} satisfies RegionConfig;

/**
 * Parse at module load. A content regression (bad option count, duplicate ID,
 * missing explanation) fails loudly here rather than silently shipping a broken
 * quiz — the same schema guards CI via `npm run validate:questions`.
 */
export const region: RegionConfig = regionConfigSchema.parse(ontario);

export const testFormat = region.testFormat;
export const freeTier = region.freeTier;
/** Store product IDs, app-facing alias for `region.productsSchema`. */
export const products = region.productsSchema;
export const entitlementId = region.entitlementId;
/** The validated bank, for screens that read content straight off the region. */
export const bank = region.bank;