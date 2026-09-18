/**
 * G1 Mode palette — dark-first.
 *
 * The app is dark-only for v1 (decided in the build plan): Gen Z audience, and
 * a single theme keeps contrast/legibility guarantees simple. Colours are
 * semantic so a future province fork only swaps `brand` values, never markup.
 *
 * Contrast targets: body text on `background` ≥ 7:1, secondary ≥ 4.5:1.
 */

/** Raw brand ramp — change these per province fork. */
export const brand = {
  violet: '#6C5CE7',
  violetBright: '#8A7BFF',
  violetDim: '#3B3475',
  cyan: '#00D2FF',
  cyanDim: '#0A4D5C',
  success: '#00E08A',
  warning: '#FFB020',
  danger: '#FF5D5D',
} as const;

/** Surfaces, from furthest back to closest to the user. */
export const surfaces = {
  background: '#0B0D17',
  card: '#151A2B',
  cardElevated: '#1D2439',
  cardPressed: '#232C45',
  border: '#262E47',
  borderStrong: '#37406A',
  overlay: 'rgba(5, 6, 12, 0.72)',
} as const;

/** Text ramp, highest contrast first. */
export const text = {
  primary: '#F4F6FF',
  secondary: '#A8B0CC',
  tertiary: '#6E7796',
  inverse: '#0B0D17',
  onBrand: '#FFFFFF',
} as const;

/** Semantic feedback colours used by the quiz engine. */
export const feedback = {
  correct: brand.success,
  correctSurface: 'rgba(0, 224, 138, 0.14)',
  correctBorder: 'rgba(0, 224, 138, 0.45)',
  incorrect: brand.danger,
  incorrectSurface: 'rgba(255, 93, 93, 0.14)',
  incorrectBorder: 'rgba(255, 93, 93, 0.45)',
} as const;

/** Gradient stops, consumed by expo-linear-gradient. */
export const gradients = {
  brand: [brand.violet, brand.cyan] as const,
  flame: ['#FFB020', brand.danger] as const,
  ring: [brand.cyan, brand.violetBright] as const,
} as const;

/**
 * Readiness bands drive copy + colour on the home ring.
 * Thresholds mirror the real test: 80% per section is a pass.
 */
export const readinessBands = {
  low: brand.danger,
  building: brand.warning,
  ready: brand.success,
} as const;

export const colors = {
  brand,
  surfaces,
  text,
  feedback,
  gradients,
  readinessBands,
} as const;

export type Colors = typeof colors;