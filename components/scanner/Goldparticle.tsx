// components/scanner/GoldParticle.tsx
import React, { useEffect } from 'react';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';

const GOLD = '#FFD700';

export interface ParticleConfig {
  angle: number;
  distance: number;
  size: number;
  delay: number;
  duration: number;
  brightness: number;
}

interface Props {
  config: ParticleConfig;
}

export const GoldParticle: React.FC<Props> = ({ config }) => {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  const endX = Math.cos(config.angle) * config.distance;
  const endY = Math.sin(config.angle) * config.distance;

  useEffect(() => {
    opacity.value = withDelay(
      config.delay,
      withTiming(config.brightness, { duration: 80 })
    );
    progress.value = withDelay(
      config.delay,
      withTiming(1, {
        duration: config.duration,
        easing: Easing.out(Easing.cubic),
      })
    );
    // Fade out último 40%
    opacity.value = withDelay(
      config.delay + config.duration * 0.6,
      withTiming(0, { duration: config.duration * 0.4 })
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: endX * progress.value },
      { translateY: endY * progress.value },
      { scale: 1.3 - progress.value * 0.8 },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: GOLD,
          shadowColor: GOLD,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: config.size * 2,
          elevation: 3,
        },
        animStyle,
      ]}
    />
  );
};

export function generateParticles(count: number): ParticleConfig[] {
  const particles: ParticleConfig[] = [];
  for (let i = 0; i < count; i++) {
    const base = (Math.PI * 2 * i) / count;
    particles.push({
      angle: base + (Math.random() - 0.5) * 0.7,
      distance: 50 + Math.random() * 80,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 100,
      duration: 500 + Math.random() * 400,
      brightness: 0.5 + Math.random() * 0.5,
    });
  }
  return particles;
}