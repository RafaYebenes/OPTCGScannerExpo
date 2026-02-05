import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';

// --- PALETA ---
const THEME = {
  maskColor: 'rgba(0, 10, 24, 0.85)', // Fondo oscuro
  accentBlue: "#669bbc",              // Azul Cyan
  glassBg: 'rgba(0, 48, 73, 0.9)',    // Etiqueta
  textWhite: "#ffffff",
  textDim: "rgba(255,255,255,0.7)",
};

const { width, height } = Dimensions.get('window');

// Medidas Carta
const CARD_ASPECT_RATIO = 63 / 90;
const OVERLAY_WIDTH = width * 0.85; 
const OVERLAY_HEIGHT = OVERLAY_WIDTH / CARD_ASPECT_RATIO;

// Coordenadas para centrar el hueco
const HOLE_X = (width - OVERLAY_WIDTH) / 2;
const HOLE_Y = (height - OVERLAY_HEIGHT) / 2;
const CORNER_RADIUS = 18; // Radio de curvatura del hueco

export const ScanOverlay = () => {
  return (
    <View style={StyleSheet.absoluteFill}>
      
      {/* CAPA 1: MÁSCARA SVG (El fondo con el agujero perfecto) */}
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Mask id="mask">
            {/* 1. Llenamos todo de BLANCO (Lo blanco se ve) */}
            <Rect x="0" y="0" width="100%" height="100%" fill="white" />
            
            {/* 2. Pintamos el hueco de NEGRO (Lo negro se hace transparente) */}
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
        
        {/* 3. Aplicamos el color oscuro usando la máscara definida arriba */}
        <Rect 
          x="0" 
          y="0" 
          width="100%" 
          height="100%" 
          fill={THEME.maskColor} 
          mask="url(#mask)" 
        />
      </Svg>

      {/* CAPA 2: ELEMENTOS DECORATIVOS (Bordes, texto...) */}
      {/* Usamos 'pointerEvents="none"' para que los toques pasen a la cámara si fuera necesario */}
      <View style={styles.contentContainer} pointerEvents="none">
        
        {/* Marco Central (Solo bordes decorativos) */}
        <View style={[styles.scanArea, { 
          top: HOLE_Y, 
          left: HOLE_X, 
          width: OVERLAY_WIDTH, 
          height: OVERLAY_HEIGHT 
        }]}>
          
          {/* Esquinas Brillantes */}
          
          
          {/* Badge Flotante */}
          <View style={styles.glassBadge}>
            <Text style={styles.glassBadgeText}>CÓDIGO AQUÍ ↘</Text>
          </View>
        </View>

        {/* Texto Instrucción (Posicionado abajo) */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>ENCAJA LA CARTA EN EL MARCO</Text>
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  
  // --- ÁREA CENTRAL ---
  scanArea: {
    position: 'absolute',
  },
  
  // --- INSTRUCCIÓN ---
  instructionContainer: {
    position: 'absolute',
    bottom: 120, // Ajusta esto según tu UI
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: THEME.textDim,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // --- ESQUINAS AZULES ---
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: THEME.accentBlue,
    borderWidth: 4,
    borderRadius: 4,
  },
  topLeft: { 
    top: 0, left: 0, 
    borderBottomWidth: 0, borderRightWidth: 0, 
    borderTopLeftRadius: 16 
  },
  topRight: { 
    top: 0, right: 0, 
    borderBottomWidth: 0, borderLeftWidth: 0, 
    borderTopRightRadius: 16 
  },
  bottomLeft: { 
    bottom: 0, left: 0, 
    borderTopWidth: 0, borderRightWidth: 0, 
    borderBottomLeftRadius: 16 
  },
  bottomRight: { 
    bottom: 0, right: 0, 
    borderTopWidth: 0, borderLeftWidth: 0, 
    borderBottomRightRadius: 16 
  },

  // --- BADGE ---
  glassBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: THEME.glassBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  glassBadgeText: {
    color: THEME.textWhite,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});