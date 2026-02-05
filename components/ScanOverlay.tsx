import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../utils/constants';

// Dimensiones de la pantalla
const { width } = Dimensions.get('window');

// CONFIGURACIÓN TCG (Estándar 63mm x 88mm)
const CARD_ASPECT_RATIO = 63 / 88; 
const OVERLAY_WIDTH = width * 0.85; // Ocupa el 85% del ancho de pantalla
const OVERLAY_HEIGHT = OVERLAY_WIDTH / CARD_ASPECT_RATIO;

export const ScanOverlay = () => {
  return (
    <View style={styles.overlay}>
      {/* Zona oscura exterior */}
      <View style={styles.background} />

      <View style={[styles.scanArea, { width: OVERLAY_WIDTH, height: OVERLAY_HEIGHT }]}>
        {/* Esquinas */}
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
        
        {/* Guía visual del código (Ahora a la DERECHA) */}
        <View style={styles.codeZone}>
          <Text style={styles.codeZoneText}>CÓDIGO AQUÍ ↘</Text>
        </View>
      </View>

      <Text style={styles.instruction}>
        Encaja la carta en el marco
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    // Un poco de oscurecimiento para resaltar el área de escaneo (opcional)
    // backgroundColor: 'rgba(0,0,0,0.3)', 
  },
  scanArea: {
    // Ya no usamos width/height fijos, vienen por props inline
    borderRadius: 12,
    // Fondo transparente para ver la cámara
    backgroundColor: 'transparent', 
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)', // Borde sutil
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.success,
    borderWidth: 4,
  },
  topLeft: { top: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 12 },
  topRight: { top: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 12 },
  bottomLeft: { bottom: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 12 },
  bottomRight: { bottom: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 12 },
  
  codeZone: {
    position: 'absolute',
    bottom: 20,
    right: 15, // <--- CAMBIO: AHORA A LA DERECHA
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  codeZoneText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  instruction: {
    position: 'absolute',
    bottom: 80, // Un poco más abajo
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    textAlign: 'center',
    overflow: 'hidden',
  },
});