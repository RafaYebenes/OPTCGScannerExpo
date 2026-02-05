import TextRecognition from '@react-native-ml-kit/text-recognition';
import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { COLORS, SCANNER_CONFIG } from '../utils/constants';

export const ScannerScreen: React.FC<ScannerScreenProps> = ({ navigation }) => {
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const { hasPermission, requestPermission } = useCameraPermission();

  const { detectionState, processDetectedText, reset } = useCardScanner();
  const { recentCards, refresh } = useCardStorage();

  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!camera.current || !hasPermission) return;

    scanIntervalRef.current = setInterval(async () => {
      if (isProcessingRef.current) return;

      try {
        isProcessingRef.current = true;

        const photo = await camera.current?.takePhoto({
          flash: 'off',
        });

        if (photo) {
          const imagePath = photo.path.startsWith('file://')
            ? photo.path
            : `file://${photo.path}`;
          const result = await TextRecognition.recognize(imagePath);
          processDetectedText(result.text);
        }
      } catch (error) {
        console.log('Error en auto-scan:', error);
      } finally {
        isProcessingRef.current = false;
      }
    }, SCANNER_CONFIG.THROTTLE_MS);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [hasPermission, processDetectedText]);

  useEffect(() => {
    if (detectionState.lastSavedCode) {
      refresh();
    }
  }, [detectionState.lastSavedCode, refresh]);

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Necesitamos acceso a la cámara para escanear cartas
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Conceder Permiso</Text>
        </Pressable>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando cámara...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />

      <ScanOverlay />
      <DetectionFeedback detectionState={detectionState} />

      <RecentScans
        cards={recentCards}
        onCardPress={() => {
          navigation.navigate('Collection');
        }}
      />

      <View style={styles.controls}>
        <Pressable
          style={styles.controlButton}
          onPress={() => navigation.navigate('Collection')}
        >
          <Text style={styles.controlButtonText}>📚 Colección</Text>
        </Pressable>

        <Pressable
          style={styles.controlButton}
          onPress={reset}
        >
          <Text style={styles.controlButtonText}>🔄 Reset</Text>
        </Pressable>
      </View>

      <View style={styles.scanIndicator}>
        <View style={styles.scanDot} />
        <Text style={styles.scanText}>Escaneando...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
  },
  permissionText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  controls: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlButton: {
    backgroundColor: COLORS.overlay,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scanIndicator: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.overlay,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scanDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 8,
  },
  scanText: {
    color: '#fff',
    fontSize: 12,
  },
});