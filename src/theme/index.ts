/**
 * Theme barrel — import design tokens from '@/theme', never from deep paths.
 *
 * Usage:
 *   import { colors, spacing, typography } from '@/theme';
 */
export { brand, colors, feedback, gradients, readinessBands, surfaces, text } from './colors';
export type { Colors } from './colors';
export { fontFamily, typography } from './typography';
export type { TypographyVariant } from './typography';
export {
  bottomTabInset,
  maxContentWidth,
  motion,
  radii,
  screenPadding,
  shadows,
  spacing,
  touchTarget,
} from './spacing';