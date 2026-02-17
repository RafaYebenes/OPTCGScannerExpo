import TextRecognition from '@react-native-ml-kit/text-recognition';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { DetectionFeedback } from '../../components/scanner/DetectionFeedback';
import { RecentScans } from '../../components/scanner/RecentScans';
import { ScanOverlay } from '../../components/scanner/ScanOverlay';
import { useCardScanner } from '../../hooks/useCardScanner';
import { useCardStorage } from '../../hooks/useCardStorage';
import { ScannerScreenProps } from '../../types/navigation.types';
import { SCANNER_CONFIG } from '../../utils/constants';

const PALETTE = {
  bgDarkGlass: 'rgba(0, 21, 37, 0.9)',
  cream: "#fdf0d5",
  lightBlue: "#669bbc",
  gold: "#FFD700",
  red: "#c1121f",
  black: "#000000",
  glassBorder: 'rgba(253, 240, 213, 0.2)'
};

export const ScannerScreen: React.FC<ScannerScreenProps> = ({ navigation }) => {
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const { hasPermission, requestPermission } = useCameraPermission();

  const { detectionState, processDetectedText } = useCardScanner();
  const { recentCards, refresh } = useCardStorage();

  // Estados
  const [isAltMode, setIsAltMode] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Manual Input
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const [focusPoint, setFocusPoint] = useState<{ x: number, y: number } | null>(null);

  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessingRef = useRef(false);
  const isAltModeRef = useRef(isAltMode);

  useEffect(() => {
    isAltModeRef.current = isAltMode;
  }, [isAltMode]);

  useEffect(() => {
    if (!camera.current || !hasPermission || showManualInput) return;

    scanIntervalRef.current = setInterval(async () => {
      if (isProcessingRef.current) return;
      try {
        isProcessingRef.current = true;
        const photo = await camera.current?.takePhoto({
          flash: torchOn ? 'on' : 'off',
          enableShutterSound: false
        });

        if (photo) {
          const imagePath = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
          const result = await TextRecognition.recognize(imagePath);
          processDetectedText(result.text, isAltModeRef.current);
        }
      } catch (error) {
        // Silent catch
      } finally {
        isProcessingRef.current = false;
      }
    }, SCANNER_CONFIG.THROTTLE_MS);

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [hasPermission, processDetectedText, torchOn, showManualInput]);

  useEffect(() => {
    if (detectionState.lastSavedCode) refresh();
  }, [detectionState.lastSavedCode, refresh]);

  const handleTapToFocus = async (event: any) => {
    try {
      const { pageX, pageY } = event.nativeEvent;
      await camera.current?.focus({ x: pageX, y: pageY });
      setFocusPoint({ x: pageX, y: pageY });
      setTimeout(() => setFocusPoint(null), 1000);
    } catch (e) {
      console.log("Error enfocando:", e);
    }
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    processDetectedText(manualCode.trim(), isAltMode);
    setManualCode('');
    setShowManualInput(false);
  };

  if (!hasPermission) return <PermissionRequest onRequest={requestPermission} />;
  if (!device) return <LoadingView />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />

      <Pressable style={StyleSheet.absoluteFill} onPress={handleTapToFocus}>
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={!showManualInput}
          photo={true}
          zoom={device.neutralZoom * 1.5}
          enableZoomGesture={true}
        />
        {focusPoint && (
          <View style={[styles.focusSquare, { left: focusPoint.x - 30, top: focusPoint.y - 30 }]} />
        )}
      </Pressable>

      <ScanOverlay />
      <DetectionFeedback detectionState={
        {
          isDetecting: detectionState.isProcessing,
          currentCode: detectionState.lastSavedCode,
          confirmationCount: 1,
          lastSavedCode: detectionState.lastSavedCode,
        }} />

      {/* --- BARRA SUPERIOR (Colección | Flash + AA) --- */}
      <SafeAreaView style={styles.topControlsContainer}>
        <View style={styles.topBar}>

          <Pressable
            style={({ pressed }) => [styles.glassButton, pressed && styles.glassButtonPressed]}
            onPress={() => navigation.navigate('Collection')}
          >
            <Text style={styles.glassButtonIcon}>📚</Text>
            <Text style={styles.glassButtonText}>COLECCIÓN</Text>
          </Pressable>

          <View style={styles.topRightButtons}>
            {/* Flash */}
            <Pressable
              style={[styles.circleButton, torchOn && { backgroundColor: PALETTE.gold, borderColor: PALETTE.gold }]}
              onPress={() => setTorchOn(!torchOn)}
            >
              <Text style={{ fontSize: 18 }}>{torchOn ? '⚡' : '🔦'}</Text>
            </Pressable>

            {/* AA (Arriba) */}
            <Pressable
              style={[styles.circleButton, isAltMode && styles.aaButtonActive]}
              onPress={() => setIsAltMode(!isAltMode)}
            >
              <Text style={[styles.aaTextTop, isAltMode && { color: '#000' }]}>AA</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* --- BOTÓN FLOTANTE MANUAL (SOLO ICONO) --- */}
      {/* Situado abajo a la derecha, encima de la lista */}
      <Pressable
        style={({ pressed }) => [styles.manualFloatingBtn, pressed && { opacity: 0.8 }]}
        onPress={() => setShowManualInput(true)}
      >
        <Text style={{ fontSize: 22 }}>⌨️</Text>
      </Pressable>

      {/* --- MODAL MANUAL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showManualInput}
        onRequestClose={() => setShowManualInput(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>INGRESAR CÓDIGO</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: OP05-060"
              placeholderTextColor="#666"
              autoCapitalize="characters"
              value={manualCode}
              onChangeText={setManualCode}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.btnCancel} onPress={() => setShowManualInput(false)}>
                <Text style={styles.btnText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.btnConfirm} onPress={handleManualSubmit}>
                <Text style={[styles.btnText, { color: '#000' }]}>Buscar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomListContainer}>
        <RecentScans
          cards={recentCards}
          onCardPress={() => navigation.navigate('Collection')}
        />
      </View>
    </View>
  );
};

const PermissionRequest = ({ onRequest }: { onRequest: () => void }) => (
  <View style={styles.centerContainer}>
    <Text style={styles.textInfo}>Cámara necesaria</Text>
    <Pressable style={styles.actionButton} onPress={onRequest}><Text style={styles.textBtn}>Permitir</Text></Pressable>
  </View>
);

const LoadingView = () => (
  <View style={styles.centerContainer}><ActivityIndicator size="large" color={PALETTE.gold} /></View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#001525' },
  textInfo: { color: PALETTE.cream, fontSize: 16, marginBottom: 20 },
  textBtn: { color: '#000', fontWeight: 'bold' },
  actionButton: { backgroundColor: PALETTE.cream, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },

  // BARRA SUPERIOR
  topControlsContainer: { position: 'absolute', top: 45, left: 0, right: 0, zIndex: 50 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 20 : 0
  },
  topRightButtons: { flexDirection: 'row', gap: 12, alignItems: 'center' },

  glassButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PALETTE.bgDarkGlass,
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 20, borderWidth: 1, borderColor: PALETTE.glassBorder,
    gap: 6,
  },
  glassButtonPressed: { backgroundColor: PALETTE.lightBlue },
  glassButtonText: { color: PALETTE.cream, fontSize: 10, fontWeight: '700' },
  glassButtonIcon: { color: PALETTE.cream, fontSize: 12 },

  circleButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: PALETTE.bgDarkGlass,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  aaButtonActive: { backgroundColor: PALETTE.gold, borderColor: PALETTE.gold },
  aaTextTop: { color: PALETTE.cream, fontWeight: '900', fontSize: 12 },

  // BOTÓN FLOTANTE MANUAL
  manualFloatingBtn: {
    position: 'absolute',
    bottom: 150, // Lo subo para que no choque con la lista de recientes
    right: 20,
    width: 44, height: 44,
    borderRadius: 12,
    backgroundColor: PALETTE.bgDarkGlass,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: PALETTE.glassBorder,
    zIndex: 60,
    // Sombra
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 5
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    width: '85%', backgroundColor: '#001525', padding: 24, borderRadius: 16,
    borderWidth: 1, borderColor: PALETTE.gold, elevation: 10
  },
  modalTitle: { color: PALETTE.gold, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, letterSpacing: 2 },
  input: {
    backgroundColor: '#000', color: '#fff', fontSize: 20, textAlign: 'center', fontWeight: 'bold',
    padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#333', marginBottom: 24
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  btnCancel: { flex: 1, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#666', borderRadius: 12 },
  btnConfirm: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: PALETTE.gold, borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  focusSquare: {
    position: 'absolute', width: 60, height: 60,
    borderWidth: 2, borderColor: PALETTE.gold,
    opacity: 0.8, borderStyle: 'dashed'
  },

  bottomListContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingBottom: Platform.OS === 'android' ? 40 : 30,
  },
});