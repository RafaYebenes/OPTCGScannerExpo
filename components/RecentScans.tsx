import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { ScannedCard } from '../types/card.types';
import { COLORS } from '../utils/constants';
import { cardCodeParser } from '../utils/cardCodeParser';

interface Props {
  cards: ScannedCard[];
  onCardPress: (card: ScannedCard) => void;
}

export const RecentScans: React.FC<Props> = ({ cards, onCardPress }) => {
  if (cards.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recién escaneadas ({cards.length})</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        {cards.map((card) => (
          <Pressable
            key={card.id}
            style={styles.card}
            onPress={() => onCardPress(card)}
          >
            <Text style={styles.cardCode}>{card.code.fullCode}</Text>
            <Text style={styles.cardSet}>
              {cardCodeParser.getSetName(card.code.set)}
            </Text>
            {card.hasAlternateArt && (
              <Text style={styles.altArtBadge}>⭐ Alt</Text>
            )}
            <Text style={styles.cardTime}>
              {formatTime(card.scannedAt)}
            </Text>
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
    bottom: 20,
    left: 0,
    right: 0,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 20,
    marginBottom: 10,
  },
  scrollView: {
    paddingLeft: 20,
  },
  card: {
    backgroundColor: COLORS.overlay,
    borderRadius: 12,
    padding: 15,
    marginRight: 10,
    minWidth: 120,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cardCode: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardSet: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 5,
  },
  altArtBadge: {
    color: '#FFD700',
    fontSize: 10,
    marginBottom: 3,
  },
  cardTime: {
    color: '#888',
    fontSize: 10,
  },
});