// components/scanner/SuccessAnimation.tsx
// Animación de éxito al registrar carta
// Glow dorado + Ring burst + Shake + Partículas + Inner shine sweep
// 100% react-native-reanimated — sin Lottie, sin dependencias extra

import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
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
import { GoldParticle, generateParticles, type ParticleConfig } from './Goldparticle';

// ─── THEME ───────────────────────────────────────────────
const T = {
  navy: '#003049',
  deepOcean: '#001525',
  cream: '#fdf0d5',
  lightBlue: '#669bbc',
  gold: '#FFD700',
  goldWarm: '#FFAA00',
  darkGlass: 'rgba(0, 21, 37, 0.88)',
  glassBorder: 'rgba(253, 240, 213, 0.12)',
  goldBorder: 'rgba(255, 215, 0, 0.35)',
  goldGlow: 'rgba(255, 215, 0, 0.18)',
  goldGlowStrong: 'rgba(255, 215, 0, 0.5)',
};

const PARTICLE_COUNT = 14;
const PILL_HEIGHT = 56;
const PILL_RADIUS = 14;

// ─── TIPOS ───────────────────────────────────────────────
interface Props {
  cardCode: string;
  isAltArt?: boolean;
}

// ─── RING BURST (anillo que se expande y desaparece) ─────
const RingBurst: React.FC = () => {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withDelay(
      60,
      withTiming(1, { duration: 600, easing: Easing.bezier(0.16, 1, 0.3, 1) })
    );
    opacity.value = withDelay(
      60,
      withTiming(0, { duration: 600, easing: Easing.bezier(0.16, 1, 0.3, 1) })
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scale.value }, { scaleY: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 200,
          height: 70,
          borderRadius: 40,
          borderWidth: 2,
          borderColor: T.gold,
        },
        animStyle,
      ]}
    />
  );
};

// ─── COMPONENTE PRINCIPAL ────────────────────────────────
export const SuccessAnimation: React.FC<Props> = ({ cardCode, isAltArt = false }) => {
  // Partículas memorizadas por cardCode — se regeneran cada nuevo scan
  const particles = useMemo(() => generateParticles(PARTICLE_COUNT), [cardCode]) as ParticleConfig[];

  // ── Shared Values ──────────────────────────────────────

  // Pill entrance
  const pillScale = useSharedValue(0.4);
  const pillOpacity = useSharedValue(0);
  const shakeX = useSharedValue(0);

  // Glow
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.7);

  // Check
  const checkScale = useSharedValue(0);
  const checkRotate = useSharedValue(-45);

  // Text
  const textOpacity = useSharedValue(0);
  const textTranslateX = useSharedValue(8);

  // Inner shine
  const shineTranslateX = useSharedValue(-150);
  const shineOpacity = useSharedValue(0);

  useEffect(() => {
    // ── 0. HAPTIC ──
    triggerSuccessHaptic();

    // ── 1. PILL: scale spring + shake ──
    pillOpacity.value = withTiming(1, { duration: 120 });
    pillScale.value = withSpring(1, {
      damping: 12,
      stiffness: 200,
      mass: 0.8,
      overshootClamping: false,
    });

    // Shake arranca un poco después del scale
    shakeX.value = withDelay(
      140,
      withSequence(
        withTiming(6, { duration: 40 }),
        withTiming(-5, { duration: 40 }),
        withTiming(3, { duration: 35 }),
        withTiming(-2, { duration: 35 }),
        withTiming(0, { duration: 30 }),
      )
    );

    // ── 2. GLOW: flash inicial → pulso suave loop ──
    glowOpacity.value = withDelay(
      30,
      withSequence(
        withTiming(1, { duration: 250, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
        withTiming(0.5, { duration: 450 }),
        // Loop continuo
        withRepeat(
          withSequence(
            withTiming(0.65, { duration: 1000 }),
            withTiming(0.35, { duration: 1000 }),
          ),
          -1,
          true
        )
      )
    );
    glowScale.value = withDelay(
      30,
      withSequence(
        withSpring(1.05, { damping: 10, stiffness: 150 }),
        withTiming(1, { duration: 400 }),
      )
    );

    // ── 3. CHECKMARK: bounce in con rotación ──
    checkScale.value = withDelay(
      130,
      withSpring(1, { damping: 8, stiffness: 250, mass: 0.6 })
    );
    checkRotate.value = withDelay(
      130,
      withSpring(0, { damping: 10, stiffness: 200 })
    );

    // ── 4. TEXTO: slide in desde la derecha ──
    textOpacity.value = withDelay(220, withTiming(1, { duration: 250 }));
    textTranslateX.value = withDelay(
      220,
      withTiming(0, { duration: 300, easing: Easing.bezier(0.16, 1, 0.3, 1) })
    );

    // ── 5. INNER SHINE: sweep de izquierda a derecha ──
    shineOpacity.value = withDelay(300, withTiming(0.12, { duration: 200 }));
    shineTranslateX.value = withDelay(
      300,
      withSequence(
        withTiming(250, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(250, { duration: 1 }), // mantener
      )
    );
    shineOpacity.value = withDelay(700, withTiming(0, { duration: 200 }));

    return () => {
      // Cleanup: cancelar animaciones en loop al desmontar
      cancelAnimation(glowOpacity);
      cancelAnimation(glowScale);
    };
  }, [cardCode]);

  // ── Animated Styles ────────────────────────────────────

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [
      { scale: pillScale.value },
      { translateX: shakeX.value },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: checkScale.value },
      { rotate: `${checkRotate.value}deg` },
    ],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateX: textTranslateX.value }],
  }));

  const shineStyle = useAnimatedStyle(() => ({
    opacity: shineOpacity.value,
    transform: [
      { translateX: shineTranslateX.value },
      { skewX: '-15deg' },
    ],
  }));

  // ── Render ─────────────────────────────────────────────

  return (
    <View style={styles.wrapper}>
      {/* ── CAPA 1: GLOW (detrás de todo) ── */}
      <Animated.View style={[styles.glowLayer, glowStyle]} />

      {/* ── CAPA 2: RING BURST ── */}
      <RingBurst key={`ring-${cardCode}`} />

      {/* ── CAPA 3: PARTÍCULAS ── */}
      <View style={styles.particlesAnchor}>
        {particles.map((p, i) => (
          <GoldParticle key={`${cardCode}-p-${i}`} config={p} />
        ))}
      </View>

      {/* ── CAPA 4: PILL ── */}
      <Animated.View style={[styles.pill, pillStyle]}>
        {/* Top highlight — glassmorphism */}
        <View style={styles.topHighlight} />

        {/* Inner shine sweep */}
        <Animated.View style={[styles.shineSweep, shineStyle]} />

        {/* Check circle */}
        <Animated.View style={[styles.checkCircle, checkStyle]}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Polyline
              points="20 6 9 17 4 12"
              stroke={T.navy}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>

        {/* Card info */}
        <Animated.View style={[styles.textContainer, textStyle]}>
          <Text style={styles.cardCodeText} numberOfLines={1}>
            {cardCode}
          </Text>
          <Text style={styles.subtitleText}>
            {isAltArt ? '⭐ Alt Art añadida' : 'Añadida al tesoro'}
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

// ─── ESTILOS ─────────────────────────────────────────────
const styles = StyleSheet.create({
  // Wrapper: dimensiones fijas para que no empuje nada al animarse
  wrapper: {
    width: 280,
    height: PILL_HEIGHT + 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Glow detrás del pill
  glowLayer: {
    position: 'absolute',
    width: 260,
    height: PILL_HEIGHT + 30,
    borderRadius: PILL_RADIUS + 18,
    backgroundColor: T.goldGlow,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: T.gold,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 25,
        }
      : {
          elevation: 15,
        }),
  },

  // Ancla de partículas: punto 0,0 en el centro
  particlesAnchor: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },

  // Pill principal
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    backgroundColor: T.darkGlass,
    borderWidth: 1.5,
    borderColor: T.goldBorder,
    paddingLeft: 10,
    paddingRight: 20,
    minWidth: 220,
    overflow: 'hidden',
    // Sombra base
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },

  // Highlight superior glassmorphism
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    borderTopLeftRadius: PILL_RADIUS,
    borderTopRightRadius: PILL_RADIUS,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },

  // Franja de brillo que recorre el pill
  shineSweep: {
    position: 'absolute',
    top: 0,
    left: -150, // Empieza fuera del pill (se mueve con translateX)
    width: 80,
    height: '100%',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },

  // Círculo del check
  checkCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: T.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    // Glow del check
    shadowColor: T.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },

  // Texto
  textContainer: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  cardCodeText: {
    color: T.cream,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  subtitleText: {
    color: T.lightBlue,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
});