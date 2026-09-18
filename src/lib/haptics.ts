import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptics wrapper.
 *
 * All haptics go through here so they can be (a) silenced in one place when the
 * user turns vibration off, and (b) no-ops on web, where expo-haptics throws.
 * Callers fire-and-forget; every function swallows its own errors so a missing
 * vibrator can never break a quiz flow.
 */

/** Global mute, flipped by the settings store. */
let enabled = true;

export function setHapticsEnabled(next: boolean) {
  enabled = next;
}

export function isHapticsEnabled() {
  return enabled;
}

function canVibrate() {
  return enabled && Platform.OS !== 'web';
}

async function safely(run: () => Promise<void>) {
  if (!canVibrate()) return;
  try {
    await run();
  } catch {
    // Ignore: haptics are a nicety, never a requirement.
  }
}

/** Light tap — selecting an answer, moving between questions. */
export function tapLight() {
  return safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Medium thud — pressing a primary button. */
export function tapMedium() {
  return safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** Success pattern — correct answer, passed simulation. */
export function success() {
  return safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Error pattern — wrong answer, failed section. */
export function error() {
  return safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

/** Warning pattern — timer running out, streak at risk. */
export function warning() {
  return safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}