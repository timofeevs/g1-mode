import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import * as haptics from '@/lib/haptics';
import { colors, gradients, radii, spacing, text, touchTarget } from '@/theme';

/**
 * Buttons.
 *
 * `PrimaryButton` carries the brand gradient (the only place violet→cyan is
 * used as a fill, so it always reads as "the main action"). Both variants
 * enforce the 44pt accessibility floor from the build plan, and both fire a
 * haptic tap on press.
 */

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Optional trailing hint, e.g. a count. */
  hint?: string;
  style?: ViewStyle;
};

export function PrimaryButton({ label, onPress, disabled, loading, hint, style }: ButtonProps) {
  const inert = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inert), busy: Boolean(loading) }}
      disabled={inert}
      onPress={() => {
        void haptics.tapMedium();
        onPress();
      }}
      style={({ pressed }) => [styles.pressable, style, pressed && styles.pressed]}>
      <LinearGradient
        colors={inert ? [colors.surfaces.cardPressed, colors.surfaces.cardPressed] : [...gradients.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primary}>
        {loading ? (
          <ActivityIndicator color={text.onBrand} />
        ) : (
          <View style={styles.primaryRow}>
            <AppText variant="bodyStrong" color={text.onBrand}>
              {label}
            </AppText>
            {hint ? (
              <AppText variant="caption" color={text.onBrand} style={styles.hint}>
                {hint}
              </AppText>
            ) : null}
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled, hint, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => {
        void haptics.tapLight();
        onPress();
      }}
      style={({ pressed }) => [styles.pressable, style, pressed && styles.pressed]}>
      <View style={[styles.secondary, disabled && styles.disabled]}>
        <View style={styles.primaryRow}>
          <AppText variant="bodyStrong">{label}</AppText>
          {hint ? (
            <AppText variant="caption" color={text.tertiary} style={styles.hint}>
              {hint}
            </AppText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: touchTarget,
    borderRadius: radii.lg,
  },
  pressed: {
    opacity: 0.85,
  },
  primary: {
    minHeight: touchTarget + 8,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  secondary: {
    minHeight: touchTarget + 8,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surfaces.card,
    borderWidth: 1,
    borderColor: colors.surfaces.border,
  },
  disabled: {
    opacity: 0.5,
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hint: {
    opacity: 0.9,
  },
});
