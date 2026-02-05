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

// --- PALETA MODERNA REFINADA ---
const THEME = {
  bgDarkGlass: 'rgba(0, 48, 73, 0.85)', // Azul oscuro muy transparente
  accentBlue: "#669bbc",                 // Azul claro brillante
  accentRed: "#c1121f",                  // Rojo vivo
  textWhite: "#ffffff",
  textDim: "rgba(255,255,255,0.7)",
  successBg: "#003049",                  // Azul oscuro sólido para éxito
};

interface Props {
  detectionState: DetectionState;
}

export const DetectionFeedback: React.FC<Props> = ({ detectionState }) => {
  const isSaved = !!detectionState.lastSavedCode;
  const isScanning = detectionState.isDetecting && !isSaved;

  // Animación sutil de "pulso" para el estado de espera
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
    opacity: idlePulse.value, // Pulso también en opacidad
  }));


  const renderContent = () => {
    // 1. ESTADO: GUARDADO (SUCCESS) - Moderno, limpio, premium
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
              Guardada en colección
            </Text>
          </View>
        </Animated.View>
      );
    }

    // 2. ESTADO: ESCANEANDO (SCANNING) - Tecnológico, dinámico
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
            {/* Icono de radar animado */}
            <View style={styles.radarIcon}>
               <View style={styles.radarDot} />
            </View>
            
            <View style={styles.scanningInfo}>
              <Text style={styles.codeHighlight}>
                {detectionState.currentCode}
              </Text>
              <Text style={styles.scanningText}>
                Analizando... {percentage}%
              </Text>
            </View>
          </View>
          
          {/* Barra de progreso ultra-fina en la base */}
          <View style={styles.progressBarBg}>
            <Animated.View 
              style={[
                styles.progressBarFill,
                { width: `${progress * 100}%` }
              ]} 
              layout={Layout.springify()}
            />
          </View>
        </Animated.View>
      );
    }

    // 3. ESTADO: PENDIENTE (IDLE) - Minimalista, no intrusivo
    return (
      <Animated.View 
        key="idle"
        entering={FadeInDown.duration(300)} 
        exiting={FadeOutUp.duration(200)}
        style={[styles.pillBase, styles.pillIdle]}
      >
         {/* Opcional: Si usas Expo, descomenta el BlurView para un efecto cristal real */}
         {/* <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} /> */}
        <Animated.View style={[styles.idleIconContainer, idleAnimatedStyle]}>
           <Text style={styles.searchIcon}>🔍</Text>
        </Animated.View>
        <Text style={styles.textIdle}>Busca una carta</Text>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
        {renderContent()}
    </View>
  );
};

const PILL_HEIGHT = 54; // Altura estándar para las píldoras
const BORDER_RADIUS = PILL_HEIGHT / 2;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // Ajustamos la posición para que flote elegantemente sobre la UI inferior
    bottom: 130, 
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  // Base común para todas las "píldoras"
  pillBase: {
    flexDirection: 'row',
    alignItems: 'center',
    height: PILL_HEIGHT,
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden', // Para que la barra de progreso no se salga
    // Sombras suaves y modernas
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },

  // --- ESTILOS: IDLE (Pendiente) ---
  pillIdle: {
    backgroundColor: THEME.bgDarkGlass,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', // Borde sutil
    minWidth: 160,
    top: -25, // Ajuste para que no choque con el navigation bar del móvil
    justifyContent: 'center',
  },
  idleIconContainer: {
    marginRight: 8,
  },
  searchIcon: {
    fontSize: 16,
    color: THEME.accentBlue,
  },
  textIdle: {
    color: THEME.textDim,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // --- ESTILOS: SCANNING (Escaneando) ---
  pillScanning: {
    backgroundColor: THEME.bgDarkGlass,
    minWidth: 220,
    flexDirection: 'column', // Cambiamos a columna para poner la barra abajo
    justifyContent: 'center',
    paddingHorizontal: 0, // Quitamos padding horizontal para que la barra llegue al borde
    borderWidth: 1.5,
    borderColor: THEME.accentBlue, // Borde azul brillante activo
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    flex: 1,
  },
  radarIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(102, 155, 188, 0.2)', // Azul claro transparente
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.accentBlue,
  },
  scanningInfo: {
    justifyContent: 'center',
  },
  codeHighlight: {
    color: THEME.textWhite,
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 1,
  },
  scanningText: {
    color: THEME.accentBlue,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  // Barra de progreso moderna (fina en la base)
  progressBarBg: {
    width: '100%',
    height: 3, // Muy fina
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.accentBlue, // Barra azul brillante
  },

  // --- ESTILOS: SUCCESS (Guardado) ---
  pillSuccess: {
    backgroundColor: THEME.successBg, // Azul oscuro sólido, premium
    paddingHorizontal: 10,
    paddingRight: 24,
    minWidth: 230,
    borderWidth: 0, // Sin borde, solo contraste limpio
  },
  successIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.accentBlue, // Círculo azul brillante
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginLeft: 6,
  },
  checkmarkIcon: {
    color: THEME.textWhite,
    fontSize: 20,
    fontWeight: 'bold',
  },
  successTitle: {
    color: THEME.textWhite,
    fontSize: 18,
    fontWeight: '900', // Extra bold
    letterSpacing: 0.5,
  },
  successSub: {
    color: THEME.accentBlue, // Subtítulo en azul claro
    fontSize: 13,
    fontWeight: '600',
  },
});