import TextRecognition from '@react-native-ml-kit/text-recognition';
import React, { useEffect, useRef, useState } from 'react';
import {
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
import { DetectionFeedback } from '../components/DetectionFeedback';
import { RecentScans } from '../components/RecentScans';
import { ScanOverlay } from '../components/ScanOverlay';
import { useCardScanner } from '../hooks/useCardScanner';
import { useCardStorage } from '../hooks/useCardStorage';
import { ScannerScreenProps } from '../types/navigation.types';
import { SCANNER_CONFIG } from '../utils/constants';

const PALETTE = {
  bgDarkGlass: 'rgba(0, 21, 37, 0.9)',
  cream: "#fdf0d5",
  lightBlue: "#669bbc",
  gold: "#FFD700",
  red: "#c1121f",
  black: "#000000"
};

export const ScannerScreen: React.FC<ScannerScreenProps> = ({ navigation }) => {
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const { hasPermission, requestPermission } = useCameraPermission();

  const { detectionState, processDetectedText } = useCardScanner();
  const { recentCards, refresh } = useCardStorage();

  // Estados
  const [isAltMode, setIsAltMode] = useState(false);
  const [exposure, setExposure] = useState(-1);
  const [torchOn, setTorchOn] = useState(false); // Linterna
  
  // Manual Input
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Focus Visual
  const [focusPoint, setFocusPoint] = useState<{x: number, y: number} | null>(null);

  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessingRef = useRef(false);

  // --- LÓGICA DE ESCANEO ---
  useEffect(() => {
    if (!camera.current || !hasPermission || showManualInput) return;
    
    scanIntervalRef.current = setInterval(async () => {
      if (isProcessingRef.current) return;
      try {
        isProcessingRef.current = true;
        
        const photo = await camera.current?.takePhoto({ 
            flash: torchOn ? 'on' : 'off', // Usamos el estado del flash
            enableShutterSound: false 
        });

        if (photo) {
          const imagePath = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
          const result = await TextRecognition.recognize(imagePath);
          processDetectedText(result.text, isAltMode);
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
  }, [hasPermission, processDetectedText, isAltMode, torchOn, showManualInput]);

  useEffect(() => {
    if (detectionState.lastSavedCode) refresh();
  }, [detectionState.lastSavedCode, refresh]);

  // --- TAP TO FOCUS ---
  const handleTapToFocus = async (event: any) => {
    try {
        const { pageX, pageY } = event.nativeEvent;
        await camera.current?.focus({ x: pageX, y: pageY });
        
        // Feedback visual
        setFocusPoint({ x: pageX, y: pageY });
        setTimeout(() => setFocusPoint(null), 1500); // Ocultar a los 1.5s
    } catch (e) {
        console.log("Error enfocando:", e);
    }
  };

  // --- PROCESAR MANUAL ---
  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    // Simulamos que el texto viene del OCR
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
            isActive={!showManualInput} // Pausar cámara si estamos escribiendo
            photo={true}
            exposure={exposure}
            zoom={device.neutralZoom * 1.5}
            enableZoomGesture={true}
        />
        
        {/* Círculo de enfoque visual */}
        {focusPoint && (
            <View style={[styles.focusCircle, { left: focusPoint.x - 25, top: focusPoint.y - 25 }]} />
        )}
      </Pressable>

      <ScanOverlay />
      <DetectionFeedback detectionState={detectionState} />

      {/* --- BARRA SUPERIOR --- */}
      <SafeAreaView style={styles.topControlsContainer}>
        <View style={styles.topBar}>
          
          <Pressable
            style={({ pressed }) => [styles.glassButton, pressed && styles.glassButtonPressed]}
            onPress={() => navigation.navigate('Collection')}
          >
            <Text style={styles.glassButtonIcon}>📚</Text>
            <Text style={styles.glassButtonText}>COLECCIÓN</Text>
          </Pressable>

          <View style={{flexDirection: 'row', gap: 10}}>
             {/* Toggle Flash */}
             <Pressable
                style={[styles.circleButton, torchOn && {backgroundColor: PALETTE.gold}]}
                onPress={() => setTorchOn(!torchOn)}
              >
                <Text style={{fontSize: 16}}>{torchOn ? '⚡' : '🔦'}</Text>
             </Pressable>

             {/* Toggle Alt Art */}
             <Pressable
                style={[styles.glassButton, isAltMode && styles.altArtActiveButton]}
                onPress={() => setIsAltMode(!isAltMode)}
              >
                <Text style={[styles.glassButtonIcon, isAltMode && { color: '#000' }]}>
                  {isAltMode ? '★' : '☆'}
                </Text>
                <Text style={[styles.glassButtonText, isAltMode && { color: '#000' }]}>
                  {isAltMode ? 'AA' : 'STD'}
                </Text>
              </Pressable>
          </View>

        </View>
      </SafeAreaView>

      {/* --- CONTROLES LATERALES (Exposición) --- */}
      <View style={styles.exposureControl}>
          <Pressable onPress={() => setExposure(Math.max(exposure - 0.5, -2))} style={styles.exposureBtn}>
             <Text style={styles.exposureText}>🌑</Text>
          </Pressable>
          <Text style={styles.exposureLabel}>LUZ</Text>
          <Pressable onPress={() => setExposure(Math.min(exposure + 0.5, 1))} style={styles.exposureBtn}>
             <Text style={styles.exposureText}>☀️</Text>
          </Pressable>
      </View>

      {/* --- BOTÓN MANUAL (Abajo a la derecha) --- */}
      <Pressable 
        style={styles.manualInputBtn} 
        onPress={() => setShowManualInput(true)}
      >
        <Text style={{fontSize: 20}}>⌨️</Text>
      </Pressable>


      {/* --- MODAL MANUAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showManualInput}
        onRequestClose={() => setShowManualInput(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Ingreso Manual</Text>
                <Text style={styles.modalSubtitle}>Ej: OP04-083</Text>
                
                <TextInput 
                    style={styles.input}
                    placeholder="CÓDIGO..."
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
                        <Text style={[styles.btnText, {color: '#000'}]}>Guardar</Text>
                    </Pressable>
                </View>
            </View>
        </View>
      </Modal>

      {/* Lista Recientes */}
      <View style={styles.bottomListContainer}>
        <RecentScans
            cards={recentCards}
            onCardPress={() => navigation.navigate('Collection')}
        />
      </View>
    </View>
  );
};

// ... (Componentes PermissionRequest y LoadingView siguen igual)
const PermissionRequest = ({ onRequest }: { onRequest: () => void }) => (
    <View style={styles.centerContainer}>
      <Text style={styles.textInfo}>Cámara necesaria</Text>
      <Pressable style={styles.actionButton} onPress={onRequest}><Text style={styles.textBtn}>Permitir</Text></Pressable>
    </View>
  );
  
  const LoadingView = () => (
    <View style={styles.centerContainer}><Text style={styles.textInfo}>Cargando...</Text></View>
  );

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#001525' },
  textInfo: { color: PALETTE.cream, fontSize: 16, marginBottom: 20 },
  textBtn: { color: '#000', fontWeight: 'bold' },
  actionButton: { backgroundColor: PALETTE.cream, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },
  
  topControlsContainer: { position: 'absolute', top: 45, left: 0, right: 0, zIndex: 50 },
  topBar: { 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 20 : 0 
  },
  
  glassButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PALETTE.bgDarkGlass,
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(253, 240, 213, 0.3)',
    gap: 6,
  },
  glassButtonPressed: { backgroundColor: PALETTE.lightBlue },
  altArtActiveButton: { backgroundColor: PALETTE.gold, borderColor: PALETTE.gold },
  glassButtonText: { color: PALETTE.cream, fontSize: 10, fontWeight: '700' },
  glassButtonIcon: { color: PALETTE.cream, fontSize: 12 },

  circleButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: PALETTE.bgDarkGlass,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },

  exposureControl: {
      position: 'absolute', right: 16, top: '35%',
      backgroundColor: PALETTE.bgDarkGlass, borderRadius: 20,
      paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center',
      gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  exposureBtn: { padding: 4 },
  exposureText: { fontSize: 16 },
  exposureLabel: { color: PALETTE.cream, fontSize: 8, fontWeight: 'bold', transform: [{rotate: '-90deg'}], width: 40, textAlign: 'center' },

  manualInputBtn: {
      position: 'absolute', right: 20, bottom: 140, // Encima de la lista
      width: 50, height: 50, borderRadius: 25,
      backgroundColor: PALETTE.lightBlue,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: "#000", shadowOffset: {width:0, height:4}, shadowOpacity:0.3, shadowRadius:4, elevation: 5,
      zIndex: 60
  },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { 
      width: '80%', backgroundColor: '#001525', padding: 24, borderRadius: 16,
      borderWidth: 1, borderColor: PALETTE.gold 
  },
  modalTitle: { color: PALETTE.cream, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  modalSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginBottom: 20 },
  input: {
      backgroundColor: '#000', color: '#fff', fontSize: 18, textAlign: 'center',
      padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333', marginBottom: 20
  },
  modalButtons: { flexDirection: 'row', gap: 10 },
  btnCancel: { flex: 1, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#666', borderRadius: 8 },
  btnConfirm: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: PALETTE.gold, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold' },

  focusCircle: {
      position: 'absolute', width: 50, height: 50,
      borderRadius: 25, borderWidth: 2, borderColor: PALETTE.gold,
      opacity: 0.8
  },

  bottomListContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingBottom: Platform.OS === 'android' ? 40 : 30, 
  },
});