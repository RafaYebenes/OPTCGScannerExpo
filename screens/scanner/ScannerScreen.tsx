// ─────────────────────────────────────────────────────────
// ScannerScreen.tsx — FRAME PROCESSOR + SMART CROP
// ─────────────────────────────────────────────────────────
// Cambios principales vs versión anterior:
//
// 1. Frame Processor (useScannerFrameProcessor) analiza brillo
//    REAL de los píxeles en cada frame de la cámara (~6x/segundo)
//
// 2. takePhoto() + cropToCodeRegion() recorta solo la esquina
//    inferior izquierda de la carta (donde está el código OP05-060)
//    antes de pasar al OCR → mucho más rápido, menos falsos positivos
//
// 3. useBrightnessAnalyzer reemplaza useLightDetection
//    (brillo real de píxeles vs heurística OCR)
//
// 4. torch como prop de Camera (linterna continua, no flash puntual)
//
// DEPENDENCIAS NUEVAS:
//   npm install vision-camera-resize-plugin expo-image-manipulator
// ─────────────────────────────────────────────────────────

import TextRecognition from '@react-native-ml-kit/text-recognition';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';

import { useIsFocused } from '@react-navigation/native';

import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { NotFoundBanner } from '../../components/scanner/NotFoundBanner';
import { RecentScans } from '../../components/scanner/RecentScans';
import { ScanOverlay } from '../../components/scanner/ScanOverlay';
import { SuccessModal } from '../../components/scanner/SuccessModal';
import { useBrightnessAnalyzer } from '../../hooks/useBrightnessAnalyzer';
import { useCardScanner } from '../../hooks/useCardScanner';
import { useCardStorage } from '../../hooks/useCardStorage';
import { useScannerFrameProcessor } from '../../hooks/useScannerFrameProcessor';
import { cardReportService } from '../../services/cardReportService';
import { ScannerScreenProps } from '../../types/navigation.types';
import { SCANNER_CONFIG } from '../../utils/constants';
import { cropToCodeRegion } from '../../utils/Imagecrop';

const PALETTE = {
  bgDarkGlass: 'rgba(0, 21, 37, 0.9)',
  cream: '#fdf0d5',
  lightBlue: '#669bbc',
  gold: '#FFD700',
  red: '#c1121f',
  black: '#000000',
  glassBorder: 'rgba(253, 240, 213, 0.2)',
};

export const ScannerScreen: React.FC<ScannerScreenProps> = ({ navigation }) => {
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const { hasPermission, requestPermission } = useCameraPermission();

  const { detectionState, processDetectedText, showSuccessModal, syncState, notFoundCode, clearNotFound } = useCardScanner();
  const { recentCards, refresh } = useCardStorage();

  // ── ¿Está esta pantalla visible? ──
  const isFocused = useIsFocused();

  // ── Brightness analyzer (reemplaza useLightDetection) ──
  const { lightConfig, brightness, onBrightnessComputed, setTorchState } =
    useBrightnessAnalyzer();

  // ── Frame Processor para brillo real ──
  const frameProcessor = useScannerFrameProcessor(onBrightnessComputed);

  const [isAltMode, setIsAltMode] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessingRef = useRef(false);
  const isAltModeRef = useRef(isAltMode);

  useEffect(() => { isAltModeRef.current = isAltMode; }, [isAltMode]);

  // ── Handler para reportar carta no encontrada ──
  const handleReportCard = async (code: string) => {
    const result = await cardReportService.reportMissingCard(code, {
      isAltArt: isAltMode,
      source: 'scanner',
    });
    clearNotFound();
    if (result.alreadyReported) {
      console.log(`[Scanner] Carta ${code} ya fue reportada anteriormente`);
    }
  };

  // Sincronizar torch con brightness analyzer
  useEffect(() => { setTorchState(torchOn); }, [torchOn, setTorchState]);

  useEffect(() => {
    if (detectionState.lastSavedCode) refresh();
  }, [detectionState.lastSavedCode, refresh]);

  // ─────────────────────────────────────────
  // LOOP DE ESCANEO — takePhoto + smart crop
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!camera.current || !hasPermission || showManualInput || !isFocused) return;

    const currentThrottle = lightConfig?.throttleMs ?? SCANNER_CONFIG.THROTTLE_MS;

    scanIntervalRef.current = setInterval(async () => {
      if (isProcessingRef.current) return;
      try {
        isProcessingRef.current = true;
        const photo = await camera.current?.takePhoto({
          enableShutterSound: false,
        });
        if (photo) {
          const imagePath = photo.path.startsWith('file://')
            ? photo.path
            : `file://${photo.path}`;

          // ── SMART CROP: solo la esquina del código ──
          let ocrUri = imagePath;
          try {
            ocrUri = await cropToCodeRegion(
              imagePath,
              photo.width,
              photo.height,
            );
          } catch (_cropErr) {
            // Fallback: imagen completa
            console.log('[Scanner] Crop fallback, usando imagen completa');
          }

          const result = await TextRecognition.recognize(ocrUri);
          if (result?.blocks) {
            const allText = result.blocks.map((b: any) => b.text).join('\n');
            
            // ── DEBUG: ver qué detecta el OCR tras el crop ──
            if (allText.length > 0) {
              console.log('[Scanner] OCR detectó:', allText.substring(0, 100));
            } else {
              console.log('[Scanner] OCR: nada detectado en imagen cropeada');
            }

            await processDetectedText(allText, isAltModeRef.current);
          } else {
            console.log('[Scanner] OCR: sin bloques de texto');
          }
        }
      } catch (_) {
        // silencioso
      } finally {
        isProcessingRef.current = false;
      }
    }, currentThrottle);

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [hasPermission, showManualInput, processDetectedText, lightConfig?.throttleMs, isFocused]);

  const handleTapToFocus = async (event: any) => {
    try {
      const { pageX, pageY } = event.nativeEvent;
      await camera.current?.focus({ x: pageX, y: pageY });
      setFocusPoint({ x: pageX, y: pageY });
      setTimeout(() => setFocusPoint(null), 1000);
    } catch (e) {
      console.log('Error enfocando:', e);
    }
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    processDetectedText(manualCode.trim(), isAltMode);
    setManualCode('');
    setShowManualInput(false);
  };

  if (!hasPermission) {
    return (
      <ScreenContainer bg="#001525" edges={['top', 'bottom']}>
        <PermissionRequest onRequest={requestPermission} />
      </ScreenContainer>
    );
  }

  if (!device) {
    return (
      <ScreenContainer bg="#001525" edges={['top', 'bottom']}>
        <LoadingView />
      </ScreenContainer>
    );
  }

  const dynamicZoom = device.neutralZoom * (lightConfig?.zoomMultiplier ?? 1.5);

  return (
    <ScreenContainer bg="#000" edges={['top']} padding={0}>
      <StatusBar barStyle="light-content" backgroundColor="black" />

      {/* CÁMARA con Frame Processor */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleTapToFocus}>
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isFocused && !showManualInput}
          photo={true}
          zoom={dynamicZoom}
          enableZoomGesture={true}
          exposure={lightConfig?.exposureOffset ?? 0}
          torch={torchOn ? 'on' : 'off'}
          frameProcessor={frameProcessor}
        />
        {focusPoint && (
          <View style={[styles.focusSquare, { left: focusPoint.x - 30, top: focusPoint.y - 30 }]} />
        )}
      </Pressable>

      <ScanOverlay
        lightLevel={lightConfig?.level ?? 'good'}
        brightness={brightness ?? 200}
        torchOn={torchOn}
      />

      {/* BARRA SUPERIOR */}
      <View style={styles.topControlsContainer}>
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.glassButton, pressed && styles.glassButtonPressed]}
            onPress={() => navigation.navigate('Collection')}
          >
            <Text style={styles.glassButtonIcon}>📚</Text>
            <Text style={styles.glassButtonText}>COLECCIÓN</Text>
          </Pressable>

          <View style={styles.topRightButtons}>
            <Pressable
              style={[
                styles.circleButton,
                torchOn && { backgroundColor: PALETTE.gold, borderColor: PALETTE.gold },
                lightConfig?.suggestTorch && !torchOn && styles.torchSuggested,
              ]}
              onPress={() => setTorchOn(!torchOn)}
            >
              <Text style={{ fontSize: 18 }}>{torchOn ? '⚡' : '🔦'}</Text>
            </Pressable>

            <Pressable
              style={[styles.circleButton, isAltMode && styles.aaButtonActive]}
              onPress={() => setIsAltMode(!isAltMode)}
            >
              <Text style={[styles.aaTextTop, isAltMode && { color: '#000' }]}>AA</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* BOTÓN FLOTANTE MANUAL */}
      <Pressable
        style={({ pressed }) => [styles.manualFloatingBtn, pressed && { opacity: 0.8 }]}
        onPress={() => setShowManualInput(true)}
      >
        <Text style={{ fontSize: 22 }}>⌨️</Text>
      </Pressable>

      {/* MODAL MANUAL */}
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

      {/* LISTA DE RECIENTES */}
      <View style={styles.bottomListContainer}>
        <RecentScans
          cards={recentCards}
          onCardPress={() => navigation.navigate('Collection')}
        />
      </View>

      {/* BANNER: CARTA NO ENCONTRADA */}
      <NotFoundBanner
        visible={!!notFoundCode}
        cardCode={notFoundCode || ''}
        onDismiss={clearNotFound}
        onReport={handleReportCard}
      />

      {/* MODAL DE ÉXITO */}
      <SuccessModal
        visible={showSuccessModal}
        cardCode={detectionState.lastSavedCode || ''}
        isAltArt={detectionState.isAltArt}
        syncState={syncState}
      />
    </ScreenContainer>
  );
};

const PermissionRequest = ({ onRequest }: { onRequest: () => void }) => (
  <View style={styles.centerContainer}>
    <Text style={styles.textInfo}>Cámara necesaria</Text>
    <Pressable style={styles.actionButton} onPress={onRequest}>
      <Text style={styles.textBtn}>Permitir</Text>
    </Pressable>
  </View>
);

const LoadingView = () => (
  <View style={styles.centerContainer}>
    <ActivityIndicator size="large" color={PALETTE.gold} />
  </View>
);

const styles = StyleSheet.create({
  centerContainer:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#001525' },
  textInfo:         { color: PALETTE.cream, fontSize: 16, marginBottom: 20 },
  textBtn:          { color: '#000', fontWeight: 'bold' },
  actionButton:     { backgroundColor: PALETTE.cream, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },

  focusSquare: {
    position: 'absolute', width: 60, height: 60,
    borderWidth: 2, borderColor: PALETTE.gold,
    opacity: 0.8, borderStyle: 'dashed',
  },

  topControlsContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: PALETTE.bgDarkGlass,
    borderBottomWidth: 1, borderBottomColor: PALETTE.glassBorder,
  },
  topRightButtons:  { flexDirection: 'row', gap: 12, alignItems: 'center' },
  glassButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PALETTE.bgDarkGlass,
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 20, borderWidth: 1, borderColor: PALETTE.glassBorder,
    gap: 6,
  },
  glassButtonPressed: { backgroundColor: PALETTE.lightBlue },
  glassButtonText:  { color: PALETTE.cream, fontSize: 10, fontWeight: '700' },
  glassButtonIcon:  { color: PALETTE.cream, fontSize: 12 },
  circleButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: PALETTE.bgDarkGlass,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  aaButtonActive:   { backgroundColor: PALETTE.gold, borderColor: PALETTE.gold },
  aaTextTop:        { color: PALETTE.cream, fontWeight: '900', fontSize: 12 },

  torchSuggested: {
    borderColor: PALETTE.gold,
    borderWidth: 2,
  },

  manualFloatingBtn: {
    position: 'absolute',
    bottom: 150, right: 20,
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: PALETTE.bgDarkGlass,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: PALETTE.glassBorder,
    zIndex: 60,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 5,
  },

  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent:  { width: '85%', backgroundColor: '#001525', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: PALETTE.gold, elevation: 10 },
  modalTitle:    { color: PALETTE.gold, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, letterSpacing: 2 },
  input:         { backgroundColor: '#000', color: '#fff', fontSize: 20, textAlign: 'center', fontWeight: 'bold', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#333', marginBottom: 24 },
  modalButtons:  { flexDirection: 'row', gap: 12 },
  btnCancel:     { flex: 1, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#666', borderRadius: 12 },
  btnConfirm:    { flex: 1, padding: 14, alignItems: 'center', backgroundColor: PALETTE.gold, borderRadius: 12 },
  btnText:       { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  bottomListContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingBottom: Platform.OS === 'android' ? 40 : 30,
  },
});