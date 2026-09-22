import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { bandForScore, readinessCopy } from '@/engine/readinessScore';
import { colors, readinessBands, text } from '@/theme';

/**
 * The home-screen readiness ring (build plan §2.5).
 *
 * A 0–100 score drawn as a ring, colour-banded by `bandForScore`. The band
 * colour and the coaching line come from the engine, so the ring can never
 * disagree with the number the engine computed.
 *
 * Sized generously (160pt) because it is the single most important glance on
 * the home screen: "am I ready yet?".
 */

const SIZE = 160;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ReadinessRing({ score, caption }: { score: number; caption?: string }) {
  const band = bandForScore(score);
  const colour = readinessBands[band];
  const clamped = Math.min(100, Math.max(0, score));

  return (
    <View style={styles.wrapper}>
      <Svg width={SIZE} height={SIZE}>
        {/* Track */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colors.surfaces.cardPressed}
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Progress — starts at 12 o'clock and sweeps clockwise. */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colour}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={CIRCUMFERENCE * (1 - clamped / 100)}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>

      <View style={styles.centre} pointerEvents="none">
        <AppText variant="numeric" color={colour}>
          {clamped}
        </AppText>
        <AppText variant="caption" color={text.tertiary}>
          READINESS
        </AppText>
      </View>

      <AppText variant="small" color={text.secondary} style={styles.copy}>
        {caption ?? readinessCopy(band)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 4,
  },
  centre: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    textAlign: 'center',
    marginTop: 8,
  },
});
