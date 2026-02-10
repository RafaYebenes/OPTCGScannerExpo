import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PALETTE } from '../../utils/theme';

interface CollectionHeaderProps {
  stats: { totalCards: number; altArts: number };
  searchText: string;
  setSearchText: (text: string) => void;
  onOpenFilters: () => void;
  isFilterActive: boolean;
  activeRarity: string | null;
  setActiveRarity: (rarity: string | null) => void;
  rarityStats: [string, number][];
}

export const CollectionHeader: React.FC<CollectionHeaderProps> = ({
  stats, searchText, setSearchText, onOpenFilters, isFilterActive,
  activeRarity, setActiveRarity, rarityStats
}) => {
  return (
    <View style={styles.headerContainer}>
      {/* TÍTULO */}
      <View style={styles.headerTopRow}>
        <View>
          <Text style={styles.subTitle}>NAKAMAS</Text>
          <Text style={styles.mainTitle}>Collection</Text>
        </View>
      </View>

      {/* SEARCH BAR & FILTER BUTTON */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar (Nombre, Código...)"
            placeholderTextColor="rgba(253, 240, 213, 0.5)"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </Pressable>
          )}
        </View>
        
        {/* BOTÓN DIALES (FILTROS) */}
        <Pressable 
          style={[styles.filterBtn, isFilterActive && styles.filterBtnActive]} 
          onPress={onOpenFilters}
        >
          <Text style={{fontSize: 18}}>⚙️</Text>
        </Pressable>
      </View>

      {/* STATS PRINCIPALES */}
      <View style={styles.mainStatsRow}>
        <View style={styles.statBoxMain}>
          <Text style={styles.statNumMain}>{stats.totalCards}</Text>
          <Text style={styles.statLabel}>TOTAL</Text>
        </View>
        <View style={styles.verticalLine} />
        <View style={styles.statBoxMain}>
          <Text style={styles.statNumAlt}>{stats.altArts}</Text>
          <Text style={styles.statLabelAlt}>ALTS</Text>
        </View>
      </View>

      {/* SCROLL DE RAREZAS */}
      <View style={styles.rarityScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 0}}>
          {/* Chip AA */}
          <Pressable 
            style={[styles.rarityChip, { borderColor: PALETTE.gold, backgroundColor: 'rgba(255, 215, 0, 0.1)' }, activeRarity === 'AA' && styles.rarityChipActive]}
            onPress={() => setActiveRarity(activeRarity === 'AA' ? null : 'AA')}
          >
            <Text style={[styles.rarityCount, { color: PALETTE.gold }]}>{stats.altArts}</Text>
            <Text style={[styles.rarityLabel, { color: PALETTE.gold }]}>AA</Text>
          </Pressable>

          {/* Resto de chips */}
          {rarityStats.map(([rarity, count]) => (
            <Pressable 
              key={rarity} 
              style={[styles.rarityChip, activeRarity === rarity && styles.rarityChipActive]}
              onPress={() => setActiveRarity(activeRarity === rarity ? null : rarity)}
            >
              <Text style={styles.rarityCount}>{count}</Text>
              <Text style={styles.rarityLabel}>{rarity}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: { marginTop: 10, marginBottom: 25, paddingHorizontal: 10 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  subTitle: { color: PALETTE.lightBlue, fontSize: 10, letterSpacing: 3, fontWeight: 'bold', marginBottom: 4 },
  mainTitle: { color: PALETTE.cream, fontSize: 36, fontWeight: '300', letterSpacing: 1 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 15, alignItems: 'center' },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, borderWidth: 1, borderColor: PALETTE.glassBorder, paddingHorizontal: 12, height: 44 },
  searchIcon: { marginRight: 8, fontSize: 14, opacity: 0.7 },
  searchInput: { flex: 1, color: PALETTE.cream, fontSize: 14, height: '100%' },
  clearIcon: { color: PALETTE.cream, fontSize: 14, padding: 4, opacity: 0.7 },
  filterBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: PALETTE.glassBorder },
  filterBtnActive: { backgroundColor: PALETTE.gold, borderColor: PALETTE.gold },
  mainStatsRow: { flexDirection: 'row', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 12 },
  statBoxMain: { flex: 1, alignItems: 'center' },
  statNumMain: { color: PALETTE.cream, fontSize: 20, fontWeight: 'bold' },
  statNumAlt: { color: PALETTE.gold, fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, marginTop: 2, fontWeight: '700' },
  statLabelAlt: { color: PALETTE.gold, fontSize: 9, marginTop: 2, fontWeight: '700' },
  verticalLine: { width: 1, height: '60%', backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center' },
  rarityScrollContainer: { flexDirection: 'row' },
  rarityChip: { alignItems: 'center', justifyContent: 'center', minWidth: 45, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: 'rgba(0, 48, 73, 0.5)', borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  rarityChipActive: { backgroundColor: PALETTE.gold, borderColor: PALETTE.gold },
  rarityCount: { color: PALETTE.cream, fontSize: 14, fontWeight: 'bold' },
  rarityLabel: { color: PALETTE.lightBlue, fontSize: 9, fontWeight: '700', marginTop: 1 },
});