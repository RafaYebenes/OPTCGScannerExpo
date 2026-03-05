import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScannedCard } from '../../types/card.types';
import { cardCodeParser } from '../../utils/cardCodeParser';

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

export const RecentScans: React.FC<Props> = ({ cards, onCardPress }) => {
  const insets = useSafeAreaInsets(); // ✅ dentro del componente

  if (cards.length === 0) return null;

  return (
    <View style={[styles.container, { bottom: insets.bottom + 25 }]}>
      <Text style={[styles.title, { marginLeft: insets.left + 20 }]}>Recientes</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, {
          paddingLeft: insets.left + 20,
          paddingRight: insets.right + 10,
        }]}
      >
        {cards.map((card) => (
          <Pressable
            key={card.id}
            style={({ pressed }) => [
              styles.card,
              { marginRight: insets.right + 10 },
              pressed && { opacity: 0.8 },
              card.hasAlternateArt && styles.altBorder
            ]}
            onPress={() => onCardPress(card)}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardCode, card.hasAlternateArt && { color: PALETTE.gold }]}>
                {card.code.fullCode}
              </Text>
              {card.hasAlternateArt && <Text style={styles.star}>★</Text>}
            </View>

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
    left: 0,
    right: 0,
  },
  title: {
    color: PALETTE.cream,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    opacity: 0.8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scrollContent: {},
  card: {
    backgroundColor: PALETTE.black,
    borderRadius: 8,
    padding: 10,
    minWidth: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  altBorder:  { borderColor: PALETTE.gold },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardCode:   { color: PALETTE.cream, fontSize: 14, fontWeight: '800' },
  star:       { color: PALETTE.gold, fontSize: 10 },
  cardBody:   { marginTop: 4 },
  cardSet:    { color: PALETTE.lightBlue, fontSize: 9, fontWeight: '700', marginBottom: 2 },
  timeText:   { color: 'rgba(253, 240, 213, 0.5)', fontSize: 9 },
});