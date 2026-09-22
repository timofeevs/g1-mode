import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import type { Question, QuestionCategory } from '@/schema/question';
import { colors, radii, spacing, text } from '@/theme';

/**
 * The question prompt + metadata, shared by Practice, Simulation and Review.
 *
 * Options are rendered by the caller (`OptionRow`) because each mode marks them
 * differently; this component owns only the prompt itself.
 */

const CATEGORY_LABEL: Record<QuestionCategory, string> = {
  signs: 'Road signs',
  rules: 'Rules of the road',
};

export function QuestionCard({
  question,
  /** Practice/review show the explanation; a simulation does not. */
  explanation,
  /** 1-based position, shown as "Question 3 of 40". */
  position,
  total,
  /** Hidden in a simulation so the section split doesn't leak mid-test. */
  showCategory = true,
}: {
  question: Question;
  explanation?: string;
  position: number;
  total: number;
  showCategory?: boolean;
}) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.meta}>
        <AppText variant="caption" color={text.tertiary}>
          QUESTION {position} OF {total}
        </AppText>
        {showCategory ? (
          <View style={styles.chip}>
            <AppText variant="caption" color={text.secondary}>
              {CATEGORY_LABEL[question.category]}
            </AppText>
          </View>
        ) : null}
      </View>

      <AppText variant="heading" style={styles.prompt}>
        {question.text}
      </AppText>

      {explanation ? (
        <View style={styles.explanation}>
          <AppText variant="smallStrong" color={text.secondary}>
            Why
          </AppText>
          <AppText variant="small" color={text.secondary}>
            {explanation}
          </AppText>
          <AppText variant="code" color={text.tertiary}>
            {question.handbookRef}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaces.card,
    borderWidth: 1,
    borderColor: colors.surfaces.border,
  },
  prompt: {
    lineHeight: 30,
  },
  explanation: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaces.card,
    borderWidth: 1,
    borderColor: colors.surfaces.border,
  },
});
