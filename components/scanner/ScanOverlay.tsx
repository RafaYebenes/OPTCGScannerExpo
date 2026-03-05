import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { LightLevel } from '../../hooks/uselightdetection';
import { LightIndicator } from './Lightindicator';

// --- PALETA "ONE PIECE" ---
const PALETTE = {
  maskColor: 'rgba(0, 10, 24, 0.85)',
  cream: "#fdf0d5",
  lightBlue: "#669bbc",
  glassBg: 'rgba(0, 21, 37, 0.8)',
  gold: '#FFD700',
  orange: '#FF8C00',
  red: '#c1121f',
};

// Color de esquinas según luz
const CORNER_COLORS: Record<LightLevel, string> = {
  good: PALETTE.cream,
  medium: PALETTE.orange,
  low: PALETTE.red,
};

const { width, height } = Dimensions.get('window');

// Medidas Carta (Standard TCG)
const CARD_ASPECT_RATIO = 63 / 88;
const OVERLAY_WIDTH = width * 0.85;
const OVERLAY_HEIGHT = OVERLAY_WIDTH / CARD_ASPECT_RATIO;

const HOLE_X = (width - OVERLAY_WIDTH) / 2;
const HOLE_Y = (height - OVERLAY_HEIGHT) / 2;
const CORNER_RADIUS = 14;

// ─── PROPS (NUEVO) ───
interface Props {
  lightLevel?: LightLevel;
  brightness?: number;
  torchOn?: boolean;
}

export const ScanOverlay: React.FC<Props> = ({
  lightLevel = 'good',
  brightness = 200,
  torchOn = false,
}) => {
  const cornerColor = CORNER_COLORS[lightLevel];

  return (
    <View style={StyleSheet.absoluteFill}>
      
      {/* 1. MÁSCARA OSCURA */}
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Mask id="mask">
            <Rect x="0" y="0" width="100%" height="100%" fill="white" />
            <Rect 
              x={HOLE_X} 
              y={HOLE_Y} 
              width={OVERLAY_WIDTH} 
              height={OVERLAY_HEIGHT} 
              rx={CORNER_RADIUS} 
              ry={CORNER_RADIUS} 
              fill="black" 
            />
          </Mask>
        </Defs>
        <Rect 
          x="0" 
          y="0" 
          width="100%" 
          height="100%" 
          fill={PALETTE.maskColor} 
          mask="url(#mask)" 
        />
      </Svg>

      {/* 2. ELEMENTOS DECORATIVOS */}
      <View style={styles.contentContainer} pointerEvents="none">
        
        <View style={[styles.scanArea, { 
          top: HOLE_Y, 
          left: HOLE_X, 
          width: OVERLAY_WIDTH, 
          height: OVERLAY_HEIGHT 
        }]}>
          
          {/* Esquinas — Color dinámico según luz */}
          <View style={[styles.corner, styles.topLeft, { borderColor: cornerColor }]} />
          <View style={[styles.corner, styles.topRight, { borderColor: cornerColor }]} />
          <View style={[styles.corner, styles.bottomLeft, { borderColor: cornerColor }]} />
          <View style={[styles.corner, styles.bottomRight, { borderColor: cornerColor }]} />
          
          {/* Badge Inferior */}
          <View style={styles.glassBadge}>
            <Text style={styles.glassBadgeText}>CÓDIGO</Text>
          </View>

          {/* ─── NUEVO: Indicador de luz dentro del área de escaneo ─── */}
          <LightIndicator
            level={lightLevel}
            brightness={brightness}
            torchOn={torchOn}
          />
        </View>

        {/* Texto Instrucción — Adaptativo */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            {lightLevel === 'low' && !torchOn
              ? 'POCA LUZ · ACTIVA EL FLASH'
              : 'ENFOCA LA CARTA'}
          </Text>
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contentContainer: { ...StyleSheet.absoluteFillObject },
  scanArea: { position: 'absolute' },
  
  instructionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: PALETTE.cream,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
    opacity: 0.8,
  },

  // Esquinas (borderColor ahora es dinámico via inline style)
  corner: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderWidth: 3,
    borderRadius: 2,
    opacity: 0.9,
  },
  topLeft: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 12 },
  topRight: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 12 },
  bottomLeft: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 12 },
  bottomRight: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 12 },

  glassBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: PALETTE.glassBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(253, 240, 213, 0.2)',
  },
  glassBadgeText: {
    color: PALETTE.cream,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
});