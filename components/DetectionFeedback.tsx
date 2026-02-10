import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { DetectionState } from '../types/card.types';
import { SCANNER_CONFIG } from '../utils/constants';

// --- PALETA "ONE PIECE" ---
const THEME = {
  bgDarkGlass: 'rgba(0, 21, 37, 0.9)', // Deep Ocean casi sólido
  navy: "#003049",
  cream: "#fdf0d5",
  lightBlue: "#669bbc",
  gold: "#FFD700",
  successBg: "#003049", // Navy sólido
};

interface Props {
  detectionState: DetectionState;
}

export const DetectionFeedback: React.FC<Props> = ({ detectionState }) => {
  const isSaved = !!detectionState.lastSavedCode;
  const isScanning = detectionState.isDetecting && !isSaved;

  const idlePulse = useSharedValue(1);
  useEffect(() => {
    if (!isScanning && !isSaved) {
      idlePulse.value = withRepeat(
        withSequence(withTiming(1.05, { duration: 1000 }), withTiming(1, { duration: 1000 })),
        -1, true
      );
    }
  }, [isScanning, isSaved]);

  const idleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: idlePulse.value }],
    opacity: idlePulse.value,
  }));

  const renderContent = () => {
    // 1. ÉXITO (GUARDADO) - Estilo Tesoro Encontrado
    if (isSaved) {
      return (
        <Animated.View 
          key="saved"
          entering={FadeInDown.springify().damping(12)}
          exiting={FadeOutUp.duration(200)}
          style={[styles.pillBase, styles.pillSuccess]}
        >
          <View style={styles.successIconCircle}>
            <Text style={styles.checkmarkIcon}>✓</Text>
          </View>
          <View>
            <Text style={styles.successTitle}>
              {detectionState.lastSavedCode}
            </Text>
            <Text style={styles.successSub}>
              Añadida al tesoro
            </Text>
          </View>
        </Animated.View>
      );
    }

    // 2. ESCANEANDO - Estilo Radar Náutico
    if (isScanning) {
      const progress = detectionState.confirmationCount / SCANNER_CONFIG.CONFIRMATION_THRESHOLD;
      const percentage = Math.min(Math.round(progress * 100), 100);
      
      return (
        <Animated.View 
          key="scanning"
          entering={FadeInDown.duration(200)} 
          exiting={FadeOutUp.duration(150)}
          style={[styles.pillBase, styles.pillScanning]}
        >
          <View style={styles.scanningRow}>
            <View style={styles.radarIcon}>
               <View style={styles.radarDot} />
            </View>
            <View style={styles.scanningInfo}>
              <Text style={styles.codeHighlight}>
                {detectionState.currentCode}
              </Text>
              <Text style={styles.scanningText}>
                Identificando... {percentage}%
              </Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <Animated.View 
              style={[styles.progressBarFill, { width: `${progress * 100}%` }]} 
              layout={Layout.springify()}
            />
          </View>
        </Animated.View>
      );
    }

    // 3. IDLE - Minimalista
    return (
      <Animated.View 
        key="idle"
        entering={FadeInDown.duration(300)} 
        exiting={FadeOutUp.duration(200)}
        style={[styles.pillBase, styles.pillIdle]}
      >
        <Animated.View style={[styles.idleIconContainer, idleAnimatedStyle]}>
           <Text style={styles.searchIcon}>⚓</Text>
        </Animated.View>
        <Text style={styles.textIdle}>Busca una carta...</Text>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
        {renderContent()}
    </View>
  );
};

const PILL_HEIGHT = 50;
const BORDER_RADIUS = 12; // Menos redondeado, más estilo "placa"

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 150, // Posición ajustada
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  pillBase: {
    flexDirection: 'row',
    alignItems: 'center',
    height: PILL_HEIGHT,
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(253, 240, 213, 0.15)', // Borde crema muy sutil
  },

  // IDLE
  pillIdle: {
    backgroundColor: THEME.bgDarkGlass,
    paddingHorizontal: 20,
    minWidth: 150,
    justifyContent: 'center',
  },
  idleIconContainer: { marginRight: 8 },
  searchIcon: { fontSize: 14, color: THEME.cream },
  textIdle: { color: THEME.cream, fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },

  // SCANNING
  pillScanning: {
    backgroundColor: THEME.bgDarkGlass,
    minWidth: 200,
    flexDirection: 'column',
    justifyContent: 'center',
    paddingHorizontal: 0,
    borderColor: THEME.lightBlue,
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    flex: 1,
  },
  radarIcon: {
    width: 20, height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(102, 155, 188, 0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  radarDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.lightBlue },
  scanningInfo: { justifyContent: 'center' },
  codeHighlight: { color: THEME.cream, fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  scanningText: { color: THEME.lightBlue, fontSize: 10, fontWeight: '600' },
  progressBarBg: { width: '100%', height: 2, backgroundColor: 'rgba(0,0,0,0.5)' },
  progressBarFill: { height: '100%', backgroundColor: THEME.lightBlue },

  // SUCCESS
  pillSuccess: {
    backgroundColor: THEME.successBg,
    paddingHorizontal: 10,
    paddingRight: 20,
    minWidth: 200,
    borderColor: THEME.gold, // Borde dorado al éxito
  },
  successIconCircle: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: THEME.lightBlue,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
    marginLeft: 4,
  },
  checkmarkIcon: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  successTitle: { color: THEME.cream, fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  successSub: { color: THEME.lightBlue, fontSize: 11, fontWeight: '600' },
});