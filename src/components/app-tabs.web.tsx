import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  type TabTriggerSlotProps,
  type TabListProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { bottomTabInset, brand, colors, radii, spacing, text } from '@/theme';

/**
 * Web tab bar.
 *
 * The native build uses `expo-router/unstable-native-tabs` (see `app-tabs.tsx`)
 * which gives real platform tab bars on iOS/Android. `expo-router/ui` has no
 * native equivalent on web, so this file is the same five destinations rendered
 * as a web header — the file extension is the whole platform switch, which is
 * why the route list here must stay in sync with the native one.
 */

const DESTINATIONS = [
  { name: 'index', href: '/', label: 'Home' },
  { name: 'practice', href: '/practice', label: 'Practice' },
  { name: 'simulation', href: '/simulation', label: 'Test' },
  { name: 'review', href: '/review', label: 'Review' },
  { name: 'profile', href: '/profile', label: 'Profile' },
] as const;

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <CustomTabList>
          {DESTINATIONS.map((destination) => (
            <TabTrigger key={destination.name} name={destination.name} href={destination.href} asChild>
              <TabButton>{destination.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: Boolean(isFocused) }}
      style={({ pressed }) => [styles.tab, isFocused && styles.tabFocused, pressed && styles.pressed]}>
      <AppText variant="smallStrong" color={isFocused ? text.primary : text.secondary}>
        {children}
      </AppText>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabList}>
      <View style={styles.inner}>
        <View style={styles.brand}>
          <View style={styles.mark} />
          <AppText variant="smallStrong">G1 Mode</AppText>
        </View>
        <View style={styles.tabs}>{props.children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: '100%',
  },
  tabList: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: colors.surfaces.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaces.border,
  },
  inner: {
    width: '100%',
    maxWidth: 720,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: 'auto',
  },
  mark: {
    width: 20,
    height: 20,
    borderRadius: radii.sm,
    backgroundColor: brand.violet,
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  tabFocused: {
    backgroundColor: colors.surfaces.card,
  },
  pressed: {
    opacity: 0.7,
  },
  // Keeps the scroll content clear of the fixed web header.
  spacer: {
    height: bottomTabInset,
  },
});
