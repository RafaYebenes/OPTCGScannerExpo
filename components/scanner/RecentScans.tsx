import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScannedCard } from '../../types/card.types';
import { cardCodeParser } from '../../utils/cardCodeParser';
// --- PALETA ---
const PALETTE = {
  black: "#000000",
  cream: "#fdf0d5",
  lightBlue: "#669bbc",
  gold: "#FFD700",
  glassBorder: "rgba(253, 240, 213, 0.3)",
};

interface Props {
  cards: ScannedCard[];
  onCardPress: (card: ScannedCard) => void;
}

const insets = useSafeAreaInsets();

export const RecentScans: React.FC<Props> = ({ cards, onCardPress }) => {
  if (cards.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recientes</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {cards.map((card) => (
          <Pressable
            key={card.id}
            style={({ pressed }) => [
              styles.card, 
              pressed && { opacity: 0.8 },
              card.hasAlternateArt && styles.altBorder
            ]}
            onPress={() => onCardPress(card)}
          >
            {/* Header del Mini Slab */}
            <View style={styles.cardHeader}>
               <Text style={[styles.cardCode, card.hasAlternateArt && { color: PALETTE.gold }]}>
                 {card.code.fullCode}
               </Text>
               {card.hasAlternateArt && <Text style={styles.star}>★</Text>}
            </View>

            {/* Cuerpo (Nombre Set) */}
            <View style={styles.cardBody}>
               <Text style={styles.cardSet} numberOfLines={1}>
                 {cardCodeParser.getSetName(card.code.set)}
               </Text>
               <Text style={styles.timeText}>{formatTime(card.scannedAt)}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const formatTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Ahora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: insets.bottom + 25,
    left: 0,
    right: 0,
  },
  title: {
    color: PALETTE.cream,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: insets.left + 20,
    marginBottom: insets.bottom + 8,
    opacity: 0.8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingLeft: insets.left + 20,
    paddingRight: insets.right + 10,
  },
  // Mini Slab Estilo "Black Box"
  card: {
    backgroundColor: PALETTE.black, // Fondo Negro Puro
    borderRadius: 8,
    padding: 10,
    marginRight: insets.right + 10,
    minWidth: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  altBorder: {
    borderColor: PALETTE.gold,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: insets.bottom + 4,
  },
  cardCode: {
    color: PALETTE.cream,
    fontSize: 14,
    fontWeight: '800',
  },
  star: { color: PALETTE.gold, fontSize: 10 },
  cardBody: {
    marginTop: insets.top + 4,
  },
  cardSet: {
    color: PALETTE.lightBlue,
    fontSize: 9,
    fontWeight: '700',
    marginBottom: insets.bottom + 2,
  },
  timeText: {
    color: 'rgba(253, 240, 213, 0.5)',
    fontSize: 9,
  },
});