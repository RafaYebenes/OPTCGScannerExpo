import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    cancelAnimation,
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { LightLevel } from '../../hooks/uselightdetection';

// ─── PALETA ───
const PALETTE = {
  cream: '#fdf0d5',
  gold: '#FFD700',
  orange: '#FF8C00',
  red: '#c1121f',
  lightBlue: '#669bbc',
  glassBg: 'rgba(0, 21, 37, 0.85)',
  glassBorder: 'rgba(253, 240, 213, 0.2)',
};

// ─── CONFIG POR NIVEL ───
const LEVEL_CONFIG: Record<LightLevel, { icon: string; label: string; color: string }> = {
  good: {
    icon: '☀️',
    label: 'Buena luz',
    color: PALETTE.gold,
  },
  medium: {
    icon: '🌤️',
    label: 'Luz media',
    color: PALETTE.orange,
  },
  low: {
    icon: '🌙',
    label: 'Poca luz · Activa flash',
    color: PALETTE.red,
  },
};

interface Props {
  level: LightLevel;
  brightness: number;
  torchOn: boolean;
}

export const LightIndicator: React.FC<Props> = ({ level, brightness, torchOn }) => {
  const config = LEVEL_CONFIG[level];
  const pulseOpacity = useSharedValue(1);

  // Solo pulsar si: luz baja Y flash apagado
  // En cualquier otro caso: opacidad fija a 1, animación cancelada.
  const shouldPulse = level === 'low' && !torchOn;

  useEffect(() => {
    if (shouldPulse) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      // Cancelar cualquier animación en curso INMEDIATAMENTE
      // y fijar opacidad a 1. cancelAnimation evita el "va y viene".
      cancelAnimation(pulseOpacity);
      pulseOpacity.value = 1;
    }
  }, [shouldPulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Cuando flash está encendido, mostramos un estado tranquilo
  const displayLabel = torchOn ? 'Flash activo' : config.label;
  const displayColor = torchOn ? PALETTE.lightBlue : config.color;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={[styles.container]}
    >
      <Animated.View style={[styles.pill, { borderColor: displayColor }, animatedStyle]}>
        <Text style={styles.icon}>{torchOn ? '⚡' : config.icon}</Text>
        <Text style={[styles.label, { color: displayColor }]}>{displayLabel}</Text>
        <View style={[styles.dot, { backgroundColor: displayColor }]} />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 15,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.glassBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  icon: {
    fontSize: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});