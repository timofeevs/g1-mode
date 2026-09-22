import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppTabs from '@/components/app-tabs';
import { AppText } from '@/components/ui/app-text';
import { initAnalytics } from '@/services/analytics';
import { colors, gradients, radii } from '@/theme';
import { useLoadFonts } from '@/theme/fonts';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';

// Keep the splash visible until fonts are ready so the Space Grotesk headings
// don't flash in the system font.
SplashScreen.preventAutoHideAsync();

/**
 * Root layout.
 *
 * All routes render inside the tab navigator (see `app-tabs.tsx`). Work that
 * must happen exactly once on launch — hydrate the SQLite mirrors, restore any
 * Supabase session, warm analytics — happens here, and the splash stays up
 * until it's done and the fonts have loaded.
 */
export default function RootLayout() {
  const [fontsLoaded] = useLoadFonts();
  const hydrate = useAppStore((state) => state.hydrate);
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    hydrate();
    void restoreSession();
    initAnalytics();
  }, [hydrate, restoreSession]);

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <View style={styles.mark}>
          <AppText variant="title" color={colors.text.onBrand} style={styles.markText}>
            G1
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppTabs />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.surfaces.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: 96,
    height: 96,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gradients.brand[0],
  },
  markText: {
    color: colors.text.onBrand,
  },
});
