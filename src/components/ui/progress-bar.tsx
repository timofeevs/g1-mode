import { StyleSheet, View } from 'react-native';

import { brand, colors, radii } from '@/theme';

/**
 * Thin progress indicator for quiz position.
 *
 * Deliberately not animated: a simulation has no time limit, so a moving bar
 * would only add anxiety without informing anything.
 */
export function ProgressBar({ value, total }: { value: number; total: number }) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: value }}
      style={styles.track}>
      <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaces.cardPressed,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: brand.cyan,
  },
});
