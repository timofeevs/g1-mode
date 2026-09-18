import { Platform } from 'react-native';

/**
 * Typography scale.
 *
 * Space Grotesk is loaded at runtime via `@expo-google-fonts/space-grotesk`
 * (see `src/theme/fonts.ts`); the OS fallback keeps the app legible in the
 * window before fonts resolve.
 */

export const fontFamily = Platform.select({
  ios: {
    display: 'SpaceGrotesk_700Bold',
    heading: 'SpaceGrotesk_600SemiBold',
    body: 'SpaceGrotesk_400Regular',
    bodyMedium: 'SpaceGrotesk_500Medium',
    mono: 'ui-monospace',
  },
  default: {
    display: 'SpaceGrotesk_700Bold',
    heading: 'SpaceGrotesk_600SemiBold',
    body: 'SpaceGrotesk_400Regular',
    bodyMedium: 'SpaceGrotesk_500Medium',
    mono: 'monospace',
  },
});

/** Every text style the UI is allowed to use. */
export const typography = {
  /** Marketing/hero copy, e.g. the countdown number. */
  display: { fontFamily: fontFamily.display, fontSize: 44, lineHeight: 48, letterSpacing: -1 },
  /** Screen titles. */
  title: { fontFamily: fontFamily.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  /** Section headers inside a screen. */
  heading: { fontFamily: fontFamily.heading, fontSize: 20, lineHeight: 26 },
  /** Question prompts and primary body copy. */
  body: { fontFamily: fontFamily.body, fontSize: 16, lineHeight: 24 },
  /** Emphasised body copy. */
  bodyStrong: { fontFamily: fontFamily.bodyMedium, fontSize: 16, lineHeight: 24 },
  /** Answer options, secondary copy. */
  small: { fontFamily: fontFamily.body, fontSize: 14, lineHeight: 20 },
  smallStrong: { fontFamily: fontFamily.bodyMedium, fontSize: 14, lineHeight: 20 },
  /** Badges, chips, tab labels. */
  caption: { fontFamily: fontFamily.bodyMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  /** Numeric stats that must not jitter (scores, timers). */
  numeric: { fontFamily: fontFamily.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.5 },
  /** Handbook references. */
  code: { fontFamily: fontFamily.mono, fontSize: 12, lineHeight: 16 },
} as const;

export type TypographyVariant = keyof typeof typography;