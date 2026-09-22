import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import * as haptics from '@/lib/haptics';
import { brand, colors, radii, spacing, text, touchTarget } from '@/theme';

/**
 * Selectable chip, used for practice length and section filters.
 *
 * A chip is a *choice*, not an action, so it is visually distinct from the
 * buttons in `ui/button.tsx`: no gradient, and selection is carried by border
 * and label colour rather than a fill — which keeps a row of four chips calm.
 */
export function SelectChip({
  label,
  selected,
  disabled,
  onPress,
  style,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => {
        void haptics.tapLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <AppText
        variant="smallStrong"
        color={selected ? brand.violetBright : disabled ? text.tertiary : text.secondary}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touchTarget - 8,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.surfaces.border,
    backgroundColor: colors.surfaces.card,
  },
  selected: {
    borderColor: brand.violetBright,
    backgroundColor: colors.surfaces.cardElevated,
  },
  pressed: {
    backgroundColor: colors.surfaces.cardPressed,
  },
  disabled: {
    opacity: 0.4,
  },
});
