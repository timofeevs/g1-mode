import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { text } from '@/theme';

/**
 * Small stat block used on Home and Profile (streak, sessions, bank progress).
 *
 * `emphasis` is for the one number that matters most in a row, so the eye lands
 * on it without needing colour.
 */
export function StatTile({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string | number;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.tile}>
      <AppText variant={emphasis ? 'numeric' : 'heading'}>{value}</AppText>
      <AppText variant="caption" color={text.tertiary} style={styles.label}>
        {label.toUpperCase()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  label: {
    textAlign: 'center',
  },
});
