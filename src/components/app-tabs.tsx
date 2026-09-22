import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { colors, text } from '@/theme';

/**
 * The app's tab bar (native, per-platform).
 *
 * Routes live under `src/app/`; each Trigger names one of them. Icons use SF
 * Symbols on iOS and Material Symbols on Android via `expo-symbols`, tinted to
 * the selected/unselected states so we never ship per-platform PNG assets.
 */
export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={colors.surfaces.background}
      indicatorColor={colors.brand.violet}
      iconColor={text.tertiary}
      labelStyle={{ selected: { color: text.primary } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="practice">
        <NativeTabs.Trigger.Label>Practice</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="checklist" md="quiz" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="simulation">
        <NativeTabs.Trigger.Label>Test</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="doc.text.fill" md="fact_check" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="review">
        <NativeTabs.Trigger.Label>Review</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="arrow.triangle.2.circlepath" md="refresh" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
