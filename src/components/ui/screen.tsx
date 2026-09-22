import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bottomTabInset, colors, maxContentWidth, screenPadding, spacing } from '@/theme';

/**
 * Screen scaffolding shared by every route.
 *
 * `Screen` scrolls (the default — most screens are taller than a phone) and
 * `ScreenBody` is the non-scrolling variant for quiz screens, which need a fixed
 * header and a footer pinned above the tab bar.
 *
 * Content is width-capped so tablets don't stretch answer rows across the
 * screen, and every screen reserves room for the native tab bar.
 */

type ScreenProps = {
  children: ReactNode;
  /** Extra bottom padding, e.g. for a pinned footer button. */
  bottomInset?: number;
  contentStyle?: ViewStyle;
};

export function Screen({ children, bottomInset = 0, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.scroll}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: bottomTabInset + bottomInset + spacing.xxl },
        contentStyle,
      ]}>
      {children}
    </ScrollView>
  );
}

export function ScreenBody({ children, bottomInset = 0, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.body,
        { paddingTop: insets.top + spacing.md, paddingBottom: bottomTabInset + bottomInset },
        contentStyle,
      ]}>
      {children}
    </View>
  );
}

/** Inner wrapper that caps line length on wide screens. */
export function ContentWidth({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.contentWidth, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.surfaces.background,
  },
  content: {
    paddingHorizontal: screenPadding,
    gap: spacing.lg,
  },
  body: {
    flex: 1,
    backgroundColor: colors.surfaces.background,
    paddingHorizontal: screenPadding,
  },
  contentWidth: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    gap: spacing.lg,
  },
});
