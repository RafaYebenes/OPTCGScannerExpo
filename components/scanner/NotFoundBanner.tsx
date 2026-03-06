import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    FadeInUp,
    FadeOutUp,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';

const PALETTE = {
  cream: '#fdf0d5',
  red: '#c1121f',
  gold: '#FFD700',
  glassBg: 'rgba(0, 21, 37, 0.95)',
  glassBorder: 'rgba(193, 18, 31, 0.4)',
};

// Cuánto tiempo se muestra el banner (ms)
const AUTO_DISMISS_MS = 6000;

interface Props {
  visible: boolean;
  cardCode: string;
  onDismiss: () => void;
  onReport: (code: string) => void;
}

export const NotFoundBanner: React.FC<Props> = ({
  visible,
  cardCode,
  onDismiss,
  onReport,
}) => {
  const progress = useSharedValue(1);

  // Barra de progreso que se va vaciando + auto-dismiss
  useEffect(() => {
    if (visible) {
      progress.value = 1;
      progress.value = withTiming(0, { duration: AUTO_DISMISS_MS });

      const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    }
  }, [visible, cardCode]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(14)}
      exiting={FadeOutUp.duration(200)}
      style={styles.container}
    >
      <View style={styles.banner}>
        {/* Contenido */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.icon}>⚠️</Text>
            <Text style={styles.title}>Carta no encontrada</Text>
          </View>

          <Text style={styles.codeText}>{cardCode}</Text>
          <Text style={styles.subtitle}>
            Este código no está en nuestra base de datos
          </Text>

          {/* Botones */}
          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.btnReport,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => onReport(cardCode)}
            >
              <Text style={styles.btnReportText}>📢 Reportar</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.btnDismiss,
                pressed && { opacity: 0.7 },
              ]}
              onPress={onDismiss}
            >
              <Text style={styles.btnDismissText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>

        {/* Barra de progreso */}
        <View style={styles.progressBg}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    zIndex: 100,
    alignItems: 'center',
  },
  banner: {
    width: '100%',
    backgroundColor: PALETTE.glassBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PALETTE.glassBorder,
    overflow: 'hidden',
    shadowColor: PALETTE.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  icon: {
    fontSize: 18,
  },
  title: {
    color: PALETTE.red,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  codeText: {
    color: PALETTE.cream,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(253, 240, 213, 0.6)',
    fontSize: 12,
    marginBottom: 14,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnReport: {
    flex: 1,
    backgroundColor: PALETTE.gold,
  },
  btnReportText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 13,
  },
  btnDismiss: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(253, 240, 213, 0.2)',
  },
  btnDismissText: {
    color: PALETTE.cream,
    fontWeight: '600',
    fontSize: 13,
  },
  progressBg: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PALETTE.red,
  },
});