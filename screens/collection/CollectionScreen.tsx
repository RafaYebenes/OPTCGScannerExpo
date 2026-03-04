/**
 * CollectionScreen — migrada a ScreenContainer
 *
 * Cambios respecto a la versión anterior:
 *  - Se elimina el <SafeAreaView> manual y su import de react-native
 *  - Se elimina el paddingTop: 40 hardcodeado en mainContainer
 *  - Se usa ScreenContainer con edges={['top','left','right']} para dejar
 *    libre el bottom (lo gestiona el FlatList con paddingBottom: 100)
 *  - El bg='transparent' permite que LinearGradient siga siendo el fondo
 */

import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { CardGridItem } from '../../components/collection/CardGridItem';
import { CollectionHeader } from '../../components/collection/CollectionHeader';
import { FilterModal } from '../../components/collection/FilterModal';
// ── NUEVO ──
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { useCollection } from '../../context/CollectionContext';
import { CollectionScreenProps } from '../../types/navigation.types';
import { PALETTE, SPACING } from '../../utils/theme';

const AVAILABLE_COLORS = ['Red', 'Green', 'Blue', 'Purple', 'Black', 'Yellow'];

export const CollectionScreen: React.FC<CollectionScreenProps> = ({ navigation }) => {
  const { collection, stats, loading, refresh, deleteCard } = useCollection();

  const [searchText, setSearchText] = useState('');
  const [activeRarity, setActiveRarity] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterColor, setFilterColor] = useState<string | null>(null);
  const [filterSet, setFilterSet] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useFocusEffect(
    useCallback(() => { refreshRef.current(); }, [])
  );

  const filteredRawCollection = useMemo(() => {
    return collection.filter(item => {
      if (!item.card) return false;
      if (searchText) {
        const query = searchText.toUpperCase();
        const matchName = item.card.name.toUpperCase().includes(query);
        const matchCode = item.card.code.toUpperCase().includes(query);
        const matchSet  = item.card.set_code.toUpperCase().includes(query);
        if (!matchName && !matchCode && !matchSet) return false;
      }
      if (activeRarity) {
        if (activeRarity === 'AA') {
          if (!item.is_foil) return false;
        } else {
          const r = item.card.rarity ? item.card.rarity.toUpperCase() : '?';
          if (r !== activeRarity) return false;
        }
      }
      if (filterColor && item.card.color !== filterColor) return false;
      if (filterSet  && item.card.set_code !== filterSet)  return false;
      return true;
    });
  }, [collection, searchText, activeRarity, filterColor, filterSet]);

  const availableSets = useMemo(
    () => [...new Set(collection.map(i => i.card?.set_code).filter(Boolean) as string[])].sort(),
    [collection]
  );

  const rarityStats = useMemo(() => {
    const counts: Record<string, number> = {};
    collection.forEach(item => {
      if (!item.card) return;
      const r = item.is_foil ? 'AA' : (item.card.rarity?.toUpperCase() ?? '?');
      counts[r] = (counts[r] ?? 0) + 1;
    });
    return counts;
  }, [collection]);

  const clearAllFilters = () => {
    setFilterColor(null);
    setFilterSet(null);
    setActiveRarity(null);
  };

  const handleDelete = (item: any) => {
    Alert.alert('Eliminar carta', `¿Eliminar ${item.card?.name ?? item.code}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteCard(item.id) },
    ]);
  };

  return (
    // LinearGradient sigue siendo el fondo visual real
    <LinearGradient
      colors={[PALETTE.deepOcean, PALETTE.navy, PALETTE.deepOcean]}
      style={styles.gradient}
    >
      {/*
        ScreenContainer con:
          - bg='transparent'  → el gradiente de atrás se ve
          - edges sin 'bottom' → el FlatList ya gestiona el scroll inferior
          - padding={0}        → el FlatList usa paddingHorizontal propio
      */}
      <ScreenContainer
        bg="transparent"
        edges={['top', 'left', 'right']}
        padding={0}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={PALETTE.gold} />
            <Text style={styles.loadingText}>Cargando colección…</Text>
          </View>
        ) : (
          <FlatList
            data={filteredRawCollection}
            keyExtractor={item => item.id}
            numColumns={3}
            ListHeaderComponent={
              <CollectionHeader
                stats={stats}
                searchText={searchText}
                setSearchText={setSearchText}
                onFilterPress={() => setShowFilterModal(true)}
                onOpenFilters={() => setShowFilterModal(true)}
                hasActiveFilters={!!filterColor || !!filterSet}
                isFilterActive={!!filterColor || !!filterSet}
                activeRarity={activeRarity}
                setActiveRarity={setActiveRarity}
                rarityStats={Object.entries(rarityStats)}
              />
            }
            refreshing={loading}
            onRefresh={refresh}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <CardGridItem
                item={item}
                onPress={i => navigation.navigate('CardDetail', { item: i })}
                onLongPress={handleDelete}
              />
            )}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Text style={{ fontSize: 40, opacity: 0.5, marginBottom: 10 }}>🏴‍☠️</Text>
                <Text style={styles.emptyText}>
                  {searchText || activeRarity || filterColor || filterSet
                    ? 'No se encontraron cartas con esos filtros'
                    : 'Sin cartas aún'}
                </Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.columnWrapper}
          />
        )}

        <FilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          availableColors={AVAILABLE_COLORS}
          filterColor={filterColor}
          setFilterColor={setFilterColor}
          availableSets={availableSets}
          filterSet={filterSet}
          setFilterSet={setFilterSet}
          onClearAll={clearAllFilters}
        />
      </ScreenContainer>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient:        { flex: 1 },
  // ── paddingTop: 40 eliminado → lo gestiona ScreenContainer via safe-area ──
  listContent:     { paddingHorizontal: SPACING.gap, paddingBottom: 100 },
  columnWrapper:   { justifyContent: 'flex-start', gap: SPACING.gap, marginBottom: SPACING.gap },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  loadingText:     { color: PALETTE.cream, marginTop: 10 },
  emptyText:       { color: PALETTE.cream, fontSize: 16, textAlign: 'center', paddingHorizontal: 20 },
});