import { Text, type TextProps } from 'react-native';

import { text as textColors, typography, type TypographyVariant } from '@/theme';

/**
 * The one text component screens use.
 *
 * Every style comes from the `typography` scale in `@/theme`, so a screen can
 * pick a *semantic* variant (`display`, `body`, `caption`) and never invent a
 * font size. Colour defaults to the primary text ramp and can be overridden for
 * the secondary/tertiary ramps.
 */

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  /** Any colour token, e.g. `textColors.secondary`. */
  color?: string;
};

export function AppText({ variant = 'body', color, style, ...rest }: AppTextProps) {
  return <Text style={[typography[variant], { color: color ?? textColors.primary }, style]} {...rest} />;
}
