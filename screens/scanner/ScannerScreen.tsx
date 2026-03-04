/**
 * ScannerScreen — migrada a ScreenContainer
 *
 * Cambios respecto a la versión anterior:
 *  - Se elimina <SafeAreaView> de react-native y su import manual
 *  - Se elimina el paddingTop hardcodeado en topBar (Platform.OS === 'android' ? X : Y)
 *  - ScreenContainer con edges={['top']} gestiona el inset superior en iOS y Android
 *  - bg='#000' preserva el fondo negro de cámara
 *  - El resto del layout (cámara fullscreen, overlays) no cambia
 */

import TextRecognition from '@react-native-ml-kit/text-recognition';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
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
// ── NUEVO ──
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { ScanOverlay } from '../../components/scanner/ScanOverlay';
import { useCardScanner } from '../../hooks/useCardScanner';
import { useCardStorage } from '../../hooks/useCardStorage';
import { ScannerScreenProps } from '../../types/navigation.types';
import { SCANNER_CONFIG } from '../../utils/constants';

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

  const { detectionState, processDetectedText } = useCardScanner();
  const { recentCards, refresh } = useCardStorage();

  const [isAltMode, setIsAltMode] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessingRef = useRef(false);
  const isAltModeRef = useRef(isAltMode);

  useEffect(() => { isAltModeRef.current = isAltMode; }, [isAltMode]);

  useEffect(() => {
    if (!camera.current || !hasPermission || showManualInput) return;

    scanIntervalRef.current = setInterval(async () => {
      if (isProcessingRef.current) return;
      try {
        isProcessingRef.current = true;
        const photo = await camera.current?.takePhoto({
          flash: torchOn ? 'on' : 'off',
          enableShutterSound: false,
        });
        if (photo) {
          const imagePath = photo.path.startsWith('file://')
            ? photo.path
            : `file://${photo.path}`;
          const result = await TextRecognition.recognize(imagePath);
          if (result?.blocks) {
            const allText = result.blocks.map((b: any) => b.text).join('\n');
            await processDetectedText(allText, isAltModeRef.current);
          }
        }
      } catch (_) {
        // silencioso
      } finally {
        isProcessingRef.current = false;
      }
    }, SCANNER_CONFIG.THROTTLE_MS);

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [hasPermission, torchOn, showManualInput, processDetectedText]);

  // ── Vistas de estado ──────────────────────────────────────────────────────
  if (!hasPermission) {
    return (
      <ScreenContainer bg="#001525" edges={['top', 'bottom']}>
        <PermissionView onRequest={requestPermission} />
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

  // ── Pantalla principal ────────────────────────────────────────────────────
  return (
    /*
     * bg='#000' → fondo negro para la cámara
     * edges={['top']} → sólo el inset superior; la cámara ocupa todo el resto
     * padding={0}     → sin padding, los overlays se posicionan de forma absoluta
     */
    <ScreenContainer bg="#000" edges={['top']} padding={0}>
      {/* Cámara fullscreen */}
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!showManualInput}
        photo
        torch={torchOn ? 'on' : 'off'}
        onTouchEnd={e => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          setFocusPoint({ x, y });
          setTimeout(() => setFocusPoint(null), 1500);
        }}
      />

      {/* Punto de foco */}
      {focusPoint && (
        <View
          style={[
            styles.focusRing,
            { top: focusPoint.y - 30, left: focusPoint.x - 30 },
          ]}
        />
      )}

      {/* Overlay de escaneo */}
      <ScanOverlay />

      {/* Feedback de detección */}
      <DetectionFeedback detectionState={detectionState} />

      {/* ── Barra superior de controles ────────────────────────────────────
          paddingTop ya NO se calcula manualmente aquí; el safe-area top
          de ScreenContainer deja el espacio necesario automáticamente.
      ─────────────────────────────────────────────────────────────────── */}
      <View style={styles.topControlsContainer}>
        <View style={styles.topBar}>
          {/* Botón volver */}
          <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.iconText}>←</Text>
          </Pressable>

          {/* Título */}
          <Text style={styles.title}>OPSCANNER</Text>

          {/* Botones derecha */}
          <View style={styles.rightControls}>
            <Pressable
              style={[styles.iconBtn, torchOn && styles.iconBtnActive]}
              onPress={() => setTorchOn(v => !v)}
            >
              <Text style={styles.iconText}>⚡</Text>
            </Pressable>
            <Pressable
              style={[styles.iconBtn, isAltMode && styles.iconBtnActive]}
              onPress={() => setIsAltMode(v => !v)}
            >
              <Text style={styles.iconText}>★</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Input manual ─────────────────────────────────────────────────── */}
      <Pressable
        style={styles.manualBtn}
        onPress={() => setShowManualInput(true)}
      >
        <Text style={styles.manualBtnText}>Código manual</Text>
      </Pressable>

      <Modal
        visible={showManualInput}
        transparent
        animationType="slide"
        onRequestClose={() => setShowManualInput(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Introducir código</Text>
            <TextInput
              style={styles.modalInput}
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="ej. OP01-001"
              placeholderTextColor="rgba(253,240,213,0.4)"
              autoCapitalize="characters"
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => { setManualCode(''); setShowManualInput(false); }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.modalConfirmBtn}
                onPress={async () => {
                  if (manualCode.trim()) {
                    await processDetectedText(manualCode.trim(), isAltMode);
                    setManualCode('');
                    setShowManualInput(false);
                  }
                }}
              >
                <Text style={styles.modalConfirmText}>Añadir</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

// ── Vistas auxiliares ─────────────────────────────────────────────────────────
const PermissionView = ({ onRequest }: { onRequest: () => void }) => (
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

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#001525' },
  textInfo: { color: PALETTE.cream, fontSize: 16, marginBottom: 20 },
  textBtn: { color: '#000', fontWeight: 'bold' },
  actionButton: { backgroundColor: PALETTE.cream, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },

  focusRing: {
    position: 'absolute',
    width: 60, height: 60,
    borderRadius: 30,
    borderWidth: 2, borderColor: PALETTE.gold,
    zIndex: 100,
  },

  // BARRA SUPERIOR
  // ── ANTES: top: 45 + paddingTop Platform-specific ──
  // ── AHORA: top: 0, el safe-area de ScreenContainer ya desplazó el contenido ──
  topControlsContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: PALETTE.bgDarkGlass,
    borderBottomWidth: 1, borderBottomColor: PALETTE.glassBorder,
  },
  title: { color: PALETTE.cream, fontWeight: '900', letterSpacing: 3, fontSize: 14 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  iconBtnActive: { backgroundColor: PALETTE.gold },
  iconText: { color: PALETTE.cream, fontSize: 16 },
  rightControls: { flexDirection: 'row', gap: 8 },

  // BOTÓN MANUAL
  manualBtn: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    backgroundColor: PALETTE.bgDarkGlass,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: PALETTE.glassBorder,
    zIndex: 30,
  },
  manualBtnText: { color: PALETTE.cream, fontSize: 13, fontWeight: '600', letterSpacing: 1 },

  // MODAL
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: { backgroundColor: '#001525', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { color: PALETTE.cream, fontSize: 16, fontWeight: '700', marginBottom: 16, letterSpacing: 1 },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.08)', color: PALETTE.cream, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 18, letterSpacing: 2, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: PALETTE.glassBorder, alignItems: 'center' },
  modalCancelText: { color: PALETTE.cream, opacity: 0.6, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: PALETTE.cream, alignItems: 'center' },
  modalConfirmText: { color: '#000', fontWeight: '800', letterSpacing: 1 },
});