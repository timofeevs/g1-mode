import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/theme';

/**
 * The card surface used for every grouped block of content.
 *
 * Two levels only — `card` for content sitting on the background, `raised` for
 * content that needs to feel tappable or selected. Keeping it to two levels is
 * what stops the dark palette from turning to mud.
 */

type CardProps = {
  children: ReactNode;
  /** `raised` adds the stronger border used for selected/active blocks. */
  tone?: 'card' | 'raised';
  style?: ViewStyle;
};

export function Card({ children, tone = 'card', style }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        tone === 'raised' && styles.raised,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaces.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.surfaces.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  raised: {
    backgroundColor: colors.surfaces.cardElevated,
    borderColor: colors.surfaces.borderStrong,
  },
});
