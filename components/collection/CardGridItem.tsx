import React from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { PALETTE, SPACING } from '../../utils/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = 3;
const CARD_WIDTH = (SCREEN_WIDTH - (SPACING.gap * (NUM_COLUMNS + 1))) / NUM_COLUMNS;

interface CardGridItemProps {
  item: any;
  onPress: (item: any) => void;
  onLongPress: (item: any) => void;
}

export const CardGridItem: React.FC<CardGridItemProps> = ({ item, onPress, onLongPress }) => {
  return (
    <Pressable 
      style={({pressed}) => [styles.slabContainer, pressed && styles.slabPressed]}
      onLongPress={() => onLongPress(item)}
      onPress={() => onPress(item)} 
      delayLongPress={300}
    >
      {/* IMAGEN */}
      <View style={StyleSheet.absoluteFill}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderBg}>
            <Text style={{fontSize: 24, opacity: 0.3}}>⚓</Text>
          </View>
        )}
      </View>

      {/* BORDE DE SELECCIÓN / RAREZA (Sutil) */}
      <View style={[
        styles.borderFrame, 
        item.isAltArt 
          ? { borderColor: PALETTE.gold, borderWidth: 2 } 
          : { borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
      ]} />

      {/* ESTRELLA ALT ART (Esquina Superior Derecha) */}
      {item.isAltArt && (
        <View style={styles.altArtStarContainer}>
          <Text style={styles.starText}>★</Text>
        </View>
      )}

      {/* === NUEVO BADGE "GLASS" (Código + Cantidad) === */}
      <View style={[
        styles.glassBadge,
        item.isAltArt && { borderColor: 'rgba(255, 215, 0, 0.4)', backgroundColor: 'rgba(0, 0, 0, 0.85)' }
      ]}>
        
        {/* CÓDIGO */}
        <Text style={styles.codeText}>{item.code}</Text>

        {/* CANTIDAD (Solo si > 1) */}
        {item.quantity > 1 && (
          <>
            <View style={styles.separator} />
            <Text style={styles.qtyText}>x{item.quantity}</Text>
          </>
        )}

      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  slabContainer: {
    width: CARD_WIDTH, 
    aspectRatio: 63 / 88, 
    borderRadius: 8, 
    backgroundColor: '#050505', 
    overflow: 'hidden', 
    position: 'relative',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  slabPressed: { opacity: 0.9, transform: [{scale: 0.98}] },
  
  borderFrame: { 
    ...StyleSheet.absoluteFillObject, 
    borderRadius: 8, 
    zIndex: 10, 
    pointerEvents: 'none' 
  },
  
  cardImage: { width: '100%', height: '100%' },
  placeholderBg: { flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },

  // --- GLASS BADGE ---
  glassBadge: {
    position: 'absolute',
    bottom: 6, 
    alignSelf: 'center', // Centrado horizontalmente
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    
    // El Efecto Glass
    backgroundColor: 'rgba(0, 15, 30, 0.75)', // Oscuro semitransparente
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)', // Borde fino y sutil
    borderRadius: 12, // Forma de cápsula
    
    paddingVertical: 3,
    paddingHorizontal: 8,
    gap: 6, // Espacio entre código y cantidad
    zIndex: 20,
    
    // Sombra sutil para separar del fondo
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.5, shadowRadius: 2,
  },
  
  codeText: {
    color: '#fff', 
    fontSize: 9, 
    fontWeight: '700',
    letterSpacing: 0.5
  },
  
  separator: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.3)'
  },

  qtyText: {
    color: PALETTE.gold, // Dorado para destacar la cantidad
    fontSize: 9,
    fontWeight: 'bold'
  },

  // --- ALT ART STAR ---
  altArtStarContainer: {
    position: 'absolute',
    top: 4, right: 4,
    width: 16, height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', // Fondo oscuro suave tras la estrella
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: PALETTE.gold,
    zIndex: 15
  },
  starText: {
    color: PALETTE.gold, fontSize: 9, fontWeight: 'bold', marginTop: -1
  }
});