// components/scanner/SuccessModal.tsx
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeOut,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Polyline } from 'react-native-svg';
import { triggerSuccessHaptic } from '../../hooks/useHaptics';
import { GoldParticle, generateParticles } from './Goldparticle';

// ─── THEME ───────────────────────────────────────────────
const T = {
  navy: '#003049',
  cream: '#fdf0d5',
  lightBlue: '#669bbc',
  gold: '#FFD700',
  goldWarm: '#FFAA00',
  darkGlass: 'rgba(0, 21, 37, 0.78)',
  goldBorder: 'rgba(255, 215, 0, 0.25)',
  goldGlow: 'rgba(255, 215, 0, 0.15)',
  goldGlowStrong: 'rgba(255, 215, 0, 0.5)',
};

const PARTICLE_COUNT = 16;

// ─── TIPOS ───────────────────────────────────────────────
interface Props {
  visible: boolean;
  cardCode: string;
  isAltArt?: boolean;
  syncState: 'syncing' | 'synced' | 'error';
}

// ─── RING BURST ──────────────────────────────────────────
const RingBurst = ({ delay }: { delay: number }) => {
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withTiming(1, { duration: 650, easing: Easing.bezier(0.16, 1, 0.3, 1) })
    );
    opacity.value = withDelay(
      delay,
      withTiming(0, { duration: 650, easing: Easing.bezier(0.16, 1, 0.3, 1) })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.ring, style]} />;
};

// ─── COMPONENTE PRINCIPAL ────────────────────────────────
export const SuccessModal = ({
  visible,
  cardCode,
  isAltArt = false,
  syncState,
}: Props) => {
  const particles = useMemo(() => generateParticles(PARTICLE_COUNT), [cardCode]);

  // Shared values
  const cardScale = useSharedValue(0.3);
  const cardOpacity = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.6);
  const checkScale = useSharedValue(0);
  const checkRotate = useSharedValue(-30);
  const codeTranslateY = useSharedValue(14);
  const codeOpacity = useSharedValue(0);
  const lineScaleX = useSharedValue(0);
  const lineOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(8);
  const subtitleOpacity = useSharedValue(0);
  const syncOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;

    triggerSuccessHaptic();

    // CARD: scale spring → shake
    cardOpacity.value = withTiming(1, { duration: 150 });
    cardScale.value = withSpring(1, { damping: 13, stiffness: 200, mass: 0.8 });
    shakeX.value = withDelay(180, withSequence(
      withTiming(7, { duration: 40 }),
      withTiming(-5, { duration: 40 }),
      withTiming(3, { duration: 35 }),
      withTiming(-1, { duration: 35 }),
      withTiming(0, { duration: 30 }),
    ));

    // GLOW: flash → pulse loop
    glowOpacity.value = withDelay(50, withSequence(
      withTiming(0.9, { duration: 250, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
      withTiming(0.45, { duration: 350 }),
      withRepeat(withSequence(
        withTiming(0.55, { duration: 1100 }),
        withTiming(0.3, { duration: 1100 }),
      ), -1, true)
    ));
    glowScale.value = withDelay(50, withSequence(
      withSpring(1.08, { damping: 10, stiffness: 150 }),
      withTiming(1, { duration: 400 }),
    ));

    // CHECK: bounce
    checkScale.value = withDelay(180, withSpring(1, { damping: 8, stiffness: 250, mass: 0.6 }));
    checkRotate.value = withDelay(180, withSpring(0, { damping: 10, stiffness: 200 }));

    // CODE: slide up
    codeOpacity.value = withDelay(250, withTiming(1, { duration: 300 }));
    codeTranslateY.value = withDelay(250, withTiming(0, { duration: 350, easing: Easing.bezier(0.16, 1, 0.3, 1) }));

    // LINE: draw
    lineOpacity.value = withDelay(380, withTiming(0.3, { duration: 200 }));
    lineScaleX.value = withDelay(380, withTiming(1, { duration: 400, easing: Easing.bezier(0.16, 1, 0.3, 1) }));

    // SUBTITLE: slide up
    subtitleOpacity.value = withDelay(420, withTiming(1, { duration: 250 }));
    subtitleTranslateY.value = withDelay(420, withTiming(0, { duration: 300, easing: Easing.bezier(0.16, 1, 0.3, 1) }));

    // SYNC indicator
    syncOpacity.value = withDelay(550, withTiming(1, { duration: 250 }));

    return () => {
      cancelAnimation(glowOpacity);
      cancelAnimation(glowScale);
    };
  }, [cardCode, visible]);

  useEffect(() => {
    if (syncState === 'synced') {
      syncOpacity.value = withDelay(200, withTiming(0, { duration: 400 }));
    }
  }, [syncState]);

  // Animated styles
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }, { translateX: shakeX.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }, { rotate: `${checkRotate.value}deg` }],
  }));
  const codeStyle = useAnimatedStyle(() => ({
    opacity: codeOpacity.value,
    transform: [{ translateY: codeTranslateY.value }],
  }));
  const lineStyle = useAnimatedStyle(() => ({
    opacity: lineOpacity.value,
    transform: [{ scaleX: lineScaleX.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));
  const syncStyle = useAnimatedStyle(() => ({
    opacity: syncOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(250)}
      style={styles.overlay}
    >
      {/* GLOW */}
      <Animated.View style={[styles.glow, glowStyle]} />

      {/* RINGS */}
      <RingBurst key={`r1-${cardCode}`} delay={80} />
      <RingBurst key={`r2-${cardCode}`} delay={180} />

      {/* PARTICLES */}
      <View style={styles.particlesAnchor}>
        {particles.map((p, i) => (
          <GoldParticle key={`${cardCode}-p-${i}`} config={p} />
        ))}
      </View>

      {/* GLASS CARD */}
      <Animated.View style={[styles.card, cardStyle]}>
        <View style={styles.topHighlight} />

        {/* Check */}
        <Animated.View style={[styles.checkCircle, checkStyle]}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Polyline
              points="20 6 9 17 4 12"
              stroke={T.navy}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>

        {/* Card code — BIG */}
        <Animated.Text style={[styles.cardCode, codeStyle]}>
          {cardCode}
        </Animated.Text>

        {/* Decorative line */}
        <Animated.View style={[styles.decorLine, lineStyle]} />

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, subtitleStyle]}>
          {isAltArt ? '⭐ ALT ART AÑADIDA' : 'AÑADIDA AL TESORO'}
        </Animated.Text>

        {/* Sync indicator */}
        <Animated.View style={[styles.syncRow, syncStyle]}>
          {syncState === 'syncing' && (
            <>
              <ActivityIndicator size="small" color={T.lightBlue} style={{ transform: [{ scale: 0.5 }] }} />
              <Text style={styles.syncText}>sincronizando...</Text>
            </>
          )}
          {syncState === 'synced' && (
            <>
              <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                <Polyline points="20 6 9 17 4 12" stroke={T.lightBlue} strokeWidth={3} strokeLinecap="round" />
              </Svg>
              <Text style={[styles.syncText, { color: T.lightBlue }]}>guardada</Text>
            </>
          )}
          {syncState === 'error' && (
            <Text style={[styles.syncText, { color: '#c1121f' }]}>error al guardar</Text>
          )}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

// ─── ESTILOS ─────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 10, 20, 0.45)',
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 40 }
      : { elevation: 20 }),
  },
  ring: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  particlesAnchor: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'visible',
  },
  card: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 21, 37, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    overflow: 'hidden',
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 15,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '35%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  cardCode: {
    color: '#fdf0d5',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 3,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textShadowColor: 'rgba(255, 215, 0, 0.15)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  decorLine: {
    width: 60,
    height: 1,
    marginVertical: 12,
    backgroundColor: '#FFD700',
  },
  subtitle: {
    color: '#669bbc',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    height: 16,
  },
  syncText: {
    fontSize: 10,
    color: 'rgba(253, 240, 213, 0.4)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});