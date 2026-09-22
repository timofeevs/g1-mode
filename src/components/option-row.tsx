import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import * as haptics from '@/lib/haptics';
import { brand, colors, feedback, radii, spacing, text, touchTarget } from '@/theme';

/**
 * One answer row.
 *
 * State is expressed as `selected` / `correct` / `incorrect` rather than a
 * boolean, because the same row has to render three different stories:
 *  - simulation, answered: only the tapped row is marked, with no right/wrong
 *    reveal (the real test gives no feedback)
 *  - practice, revealed: the correct row is green, a wrong tap is red
 *  - review, revealed: correct row highlighted for self-assessment
 */

export type OptionState = 'idle' | 'selected' | 'correct' | 'incorrect';

type OptionRowProps = {
  label: string;
  index: number;
  state: OptionState;
  /** Dimmed when the answer is revealed and this row is neither right nor tapped. */
  dimmed?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

const LETTERS = ['A', 'B', 'C', 'D'];

export function OptionRow({ label, index, state, dimmed, disabled, onPress }: OptionRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: state === 'selected', disabled: Boolean(disabled) }}
      accessibilityLabel={`Option ${LETTERS[index] ?? index + 1}: ${label}`}
      disabled={disabled}
      onPress={() => {
        void haptics.tapLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        state === 'selected' && styles.selected,
        state === 'correct' && styles.correct,
        state === 'incorrect' && styles.incorrect,
        dimmed && styles.dimmed,
        pressed && !disabled && styles.pressed,
      ]}>
      <View
        style={[
          styles.badge,
          state === 'correct' && styles.badgeCorrect,
          state === 'incorrect' && styles.badgeIncorrect,
          state === 'selected' && styles.badgeSelected,
        ]}>
        <AppText variant="caption" color={state === 'idle' ? text.secondary : text.onBrand}>
          {LETTERS[index] ?? index + 1}
        </AppText>
      </View>

      <AppText variant="body" style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touchTarget + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaces.border,
    backgroundColor: colors.surfaces.card,
  },
  pressed: {
    backgroundColor: colors.surfaces.cardPressed,
  },
  selected: {
    borderColor: brand.violetBright,
    backgroundColor: colors.surfaces.cardElevated,
  },
  correct: {
    borderColor: feedback.correctBorder,
    backgroundColor: feedback.correctSurface,
  },
  incorrect: {
    borderColor: feedback.incorrectBorder,
    backgroundColor: feedback.incorrectSurface,
  },
  dimmed: {
    opacity: 0.45,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaces.cardPressed,
  },
  badgeSelected: {
    backgroundColor: brand.violet,
  },
  badgeCorrect: {
    backgroundColor: feedback.correct,
  },
  badgeIncorrect: {
    backgroundColor: feedback.incorrect,
  },
  label: {
    flex: 1,
  },
});
