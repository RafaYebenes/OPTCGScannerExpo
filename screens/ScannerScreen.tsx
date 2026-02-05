import TextRecognition from '@react-native-ml-kit/text-recognition';
import React, { useEffect, useRef } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { DetectionFeedback } from '../components/DetectionFeedback';
import { RecentScans } from '../components/RecentScans';
import { ScanOverlay } from '../components/ScanOverlay';
import { useCardScanner } from '../hooks/useCardScanner';
import { useCardStorage } from '../hooks/useCardStorage';
import { ScannerScreenProps } from '../types/navigation.types';
import { SCANNER_CONFIG } from '../utils/constants';

// --- TEMA VISUAL ---
const THEME = {
  bgDarkGlass: 'rgba(12, 111, 164, 0.85)', // Cristal Oscuro
  accentBlue: "#669bbc",                // Azul Brillante
  textWhite: "#ffffff",
};

export const ScannerScreen: React.FC<ScannerScreenProps> = ({ navigation }) => {
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const { hasPermission, requestPermission } = useCameraPermission();

  const { detectionState, processDetectedText, reset } = useCardScanner();
  const { recentCards, refresh } = useCardStorage();

  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessingRef = useRef(false);

  // Efecto de inicialización de cámara y OCR
  useEffect(() => {
    if (!camera.current || !hasPermission) return;

    scanIntervalRef.current = setInterval(async () => {
      if (isProcessingRef.current) return;
      try {
        isProcessingRef.current = true;
        const photo = await camera.current?.takePhoto({ flash: 'off' });
        
        if (photo) {
          // Corrección crítica para rutas en Android
          const imagePath = photo.path.startsWith('file://') 
            ? photo.path 
            : `file://${photo.path}`;
            
          const result = await TextRecognition.recognize(imagePath);
          processDetectedText(result.text);
        }
      } catch (error) {
        // Silenciamos errores de frame perdido para no saturar logs
      } finally {
        isProcessingRef.current = false;
      }
    }, SCANNER_CONFIG.THROTTLE_MS);

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [hasPermission, processDetectedText]);

  // Refrescar lista cuando se guarda una carta nueva
  useEffect(() => {
    if (detectionState.lastSavedCode) refresh();
  }, [detectionState.lastSavedCode, refresh]);

  // Pantallas de carga / permiso
  if (!hasPermission) return <PermissionRequest onRequest={requestPermission} />;
  if (!device) return <LoadingView />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />

      {/* 1. Capas Visuales (Overlay y Feedback) */}
      <ScanOverlay />
      <DetectionFeedback detectionState={detectionState} />

      {/* 2. Controles Superiores (Glass Pills) */}
      <SafeAreaView style={styles.topControlsContainer}>
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.glassButton, pressed && styles.glassButtonPressed]}
            onPress={() => navigation.navigate('Collection')}
          >
            <Text style={styles.glassButtonIcon}>📚</Text>
            <Text style={styles.glassButtonText}>Colección</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.glassButton, pressed && styles.glassButtonPressed]}
            onPress={reset}
          >
            <Text style={styles.glassButtonText}>Reiniciar</Text>
            <Text style={styles.glassButtonIcon}>↺</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* 3. Lista de Recientes (Fondo) */}
      <View style={styles.bottomListContainer}>
        <RecentScans
          cards={recentCards}
          onCardPress={() => navigation.navigate('Collection')}
        />
      </View>
    </View>
  );
};

// Sub-componentes auxiliares
const PermissionRequest = ({ onRequest }: { onRequest: () => void }) => (
  <View style={styles.centerContainer}>
    <Text style={styles.textWhite}>Cámara necesaria para escanear</Text>
    <Pressable style={styles.actionButton} onPress={onRequest}>
      <Text style={styles.textBold}>Conceder Permiso</Text>
    </Pressable>
  </View>
);

const LoadingView = () => (
  <View style={styles.centerContainer}>
    <Text style={styles.textWhite}>Iniciando sistema...</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#001d3d',
  },
  textWhite: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    fontWeight: '500',
  },
  textBold: {
    color: '#fff',
    fontWeight: 'bold',
  },
  actionButton: {
    backgroundColor: THEME.accentBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  
  // --- BARRA SUPERIOR CRISTAL ---
  topControlsContainer: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10, // Ajuste para status bar
  },
  glassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.bgDarkGlass,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    gap: 8,
  },
  glassButtonPressed: {
    backgroundColor: THEME.accentBlue,
    borderColor: THEME.accentBlue,
  },
  glassButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  glassButtonIcon: {
    color: '#fff',
    fontSize: 14,
  },

  // --- CONTENEDOR INFERIOR ---
  bottomListContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // Ajuste para que no choque con el navigation bar del móvil
    paddingBottom: Platform.OS === 'android' ? 40 : 30, 
  },
});