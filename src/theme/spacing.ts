import { Platform } from 'react-native';

/** 4pt base scale. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/**
 * Accessibility floor from the build plan: every tappable surface is ≥ 44pt.
 * `src/components/HapticButton` enforces this so screens cannot regress it.
 */
export const touchTarget = 44;

/** Screen-level padding, shared by every route. */
export const screenPadding = spacing.lg;

/** Bottom inset for tab bars (native tabs differ per platform). */
export const bottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

/** Caps content width so tablets don't stretch answer rows absurdly. */
export const maxContentWidth = 720;

/** Elevation presets (iOS shadow + Android elevation kept in sync). */
export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    default: { elevation: 4 },
  }),
  raised: Platform.select({
    ios: {
      shadowColor: '#6C5CE7',
      shadowOpacity: 0.4,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
    },
    default: { elevation: 8 },
  }),
} as const;

/** Standard durations; reanimated configs read from here. */
export const motion = {
  fast: 160,
  base: 240,
  slow: 400,
} as const;