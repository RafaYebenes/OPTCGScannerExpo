import React from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      style={({ pressed }) => [styles.slabContainer, pressed && styles.slabPressed]}
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
            <Text style={{ fontSize: 24, opacity: 0.3 }}>⚓</Text>
          </View>
        )}
      </View>

      {/* BORDE DE SELECCIÓN / RAREZA */}
      <View style={[
        styles.borderFrame,
        item.isAltArt
          ? { borderColor: PALETTE.gold, borderWidth: 2 }
          : { borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
      ]} />

      {/* ESTRELLA ALT ART */}
      {item.isAltArt && (
        <View style={[
          styles.altArtStarContainer,
          { top: insets.top + 4, right: insets.right + 4 }
        ]}>
          <Text style={[styles.starText, { marginTop: insets.top - 1 }]}>★</Text>
        </View>
      )}

      {/* BADGE GLASS */}
      <View style={[
        styles.glassBadge,
        item.isAltArt && { borderColor: 'rgba(255, 215, 0, 0.4)', backgroundColor: 'rgba(0, 0, 0, 0.85)' }
      ]}>
        <Text style={styles.codeText}>{item.code}</Text>
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
  slabPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  borderFrame: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    zIndex: 10,
    pointerEvents: 'none'
  },
  cardImage: { width: '100%', height: '100%' },
  placeholderBg: { flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  glassBadge: {
    position: 'absolute',
    bottom: 6,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 15, 30, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    gap: 6,
    zIndex: 20,
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
    color: PALETTE.gold,
    fontSize: 9,
    fontWeight: 'bold'
  },
  altArtStarContainer: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16, height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: PALETTE.gold,
    zIndex: 15
  },
  starText: {
    color: PALETTE.gold, fontSize: 9, fontWeight: 'bold'
  }
});