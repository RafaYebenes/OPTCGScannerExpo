import TextRecognition from '@react-native-ml-kit/text-recognition';
import React, { useEffect, useRef } from 'react';
import {
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

// --- PALETA "ONE PIECE" ---
const THEME = {
  bgDarkGlass: 'rgba(0, 21, 37, 0.8)', // Glass Oscuro
  cream: "#fdf0d5",
  lightBlue: "#669bbc",
};

export const ScannerScreen: React.FC<ScannerScreenProps> = ({ navigation }) => {
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const { hasPermission, requestPermission } = useCameraPermission();

  const { detectionState, processDetectedText } = useCardScanner();
  const { recentCards, refresh } = useCardStorage();

  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!camera.current || !hasPermission) return;
    scanIntervalRef.current = setInterval(async () => {
      if (isProcessingRef.current) return;
      try {
        isProcessingRef.current = true;
        const photo = await camera.current?.takePhoto({ flash: 'off' });
        if (photo) {
          const imagePath = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
          const result = await TextRecognition.recognize(imagePath);
          processDetectedText(result.text);
        }
      } catch (error) {
      } finally {
        isProcessingRef.current = false;
      }
    }, SCANNER_CONFIG.THROTTLE_MS);

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [hasPermission, processDetectedText]);

  useEffect(() => {
    if (detectionState.lastSavedCode) refresh();
  }, [detectionState.lastSavedCode, refresh]);

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

      {/* Capas Visuales */}
      <ScanOverlay />
      <DetectionFeedback detectionState={detectionState} />

      {/* Botón Superior */}
      <SafeAreaView style={styles.topControlsContainer}>
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.glassButton, pressed && styles.glassButtonPressed]}
            onPress={() => navigation.navigate('Collection')}
          >
            <Text style={styles.glassButtonIcon}>📚</Text>
            <Text style={styles.glassButtonText}>IR A COLECCIÓN</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Recientes */}
      <RecentScans
        cards={recentCards}
        onCardPress={() => navigation.navigate('Collection')}
      />
    </View>
  );
};

const PermissionRequest = ({ onRequest }: { onRequest: () => void }) => (
  <View style={styles.centerContainer}>
    <Text style={styles.textInfo}>Cámara necesaria</Text>
    <Pressable style={styles.actionButton} onPress={onRequest}>
      <Text style={styles.textBtn}>Conceder Permiso</Text>
    </Pressable>
  </View>
);

const LoadingView = () => (
  <View style={styles.centerContainer}>
    <Text style={styles.textInfo}>Iniciando...</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#001525' },
  textInfo: { color: THEME.cream, fontSize: 16, marginBottom: 20 },
  textBtn: { color: '#000', fontWeight: 'bold' },
  actionButton: { backgroundColor: THEME.cream, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },
  
  topControlsContainer: { position: 'absolute', top: 60, left: 0, right: 0, zIndex: 50 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20 },
  
  glassButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: THEME.bgDarkGlass,
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(253, 240, 213, 0.3)',
    gap: 6,
  },
  glassButtonPressed: { backgroundColor: THEME.lightBlue },
  glassButtonText: { color: THEME.cream, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  glassButtonIcon: { fontSize: 12 },
});