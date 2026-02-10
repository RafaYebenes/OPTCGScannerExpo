import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useLayoutEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
// CAMBIO IMPORTANTE: Usamos el contexto, no el hook antiguo
import { useCollection } from '../context/CollectionContext';
import { CollectionScreenProps } from '../types/navigation.types';
import { cardCodeParser } from '../utils/cardCodeParser';

// --- PALETA "ONE PIECE" ---
const PALETTE = {
  deepOcean: "#001525",
  navy: "#003049",
  lightBlue: "#669bbc",
  cream: "#fdf0d5",       
  red: "#c1121f",         
  gold: "#FFD700",
  black: "#000000"
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = 3;
const GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - (GAP * (NUM_COLUMNS + 1))) / NUM_COLUMNS;
const MAX_NAME_CHARS = 32; 

export const CollectionScreen: React.FC<CollectionScreenProps> = ({ navigation }) => {
  // CAMBIO IMPORTANTE: Extraemos deleteCard del contexto
  const { collection, stats, loading, refresh, deleteCard } = useCollection();

  // 1. OCULTAR CABECERA NATIVA
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Si usamos el contexto global, a veces no hace falta el useFocusEffect para recargar,
  // pero lo dejamos por seguridad para asegurar que esté fresco al volver.
  useFocusEffect(
    useCallback(() => {
      // refresh(); // Opcional si el contexto ya se actualiza solo
    }, []) // Dejamos el array vacío o quitamos el hook si ya carga bien
  );

  // ... (El resto de tu lógica de renderizado stats/cards sigue IGUAL) ...
  // Solo copio la parte de handleDelete para confirmar que usa el deleteCard que hemos traído

  const rarityStats = useMemo(() => {
    const counts: Record<string, number> = {};
    collection.forEach(item => {
      const r = item.card?.rarity ? item.card.rarity.toUpperCase() : '?'; // Ojo: item.card.rarity
      let label = r;
      if (r === 'LEADER') label = 'L';
      if (r === 'COMMON') label = 'C';
      if (r === 'UNCOMMON') label = 'UC';
      if (r === 'RARE') label = 'R';
      if (r === 'SUPER RARE') label = 'SR';
      if (r === 'SECRET RARE') label = 'SEC';
      counts[label] = (counts[label] || 0) + 1;
    });
    const sortOrder = ['L', 'C', 'UC', 'R', 'SR', 'SEC', 'P'];
    return Object.entries(counts).sort((a, b) => {
      const idxA = sortOrder.indexOf(a[0]);
      const idxB = sortOrder.indexOf(b[0]);
      if (idxA === -1 && idxB === -1) return a[0].localeCompare(b[0]);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [collection]);

  const truncateText = (text: string, limit: number) => {
    if (!text) return '';
    return text.length > limit ? text.substring(0, limit) + '...' : text;
  };

  const groupedCollection = useMemo(() => {
    const groups = new Map();
    collection.forEach((item) => {
      // OJO: Asegúrate que item.card existe
      if (!item.card) return;
      const key = `${item.card.code}-${item.is_foil}`; // Usamos is_foil en BD
      if (groups.has(key)) {
        const existing = groups.get(key);
        existing.quantity += 1;
        existing.ids.push(item.id);
      } else {
        groups.set(key, { 
            ...item, 
            code: item.card.code, // Mapeamos propiedades planas para facilitar render
            name: item.card.name,
            image: item.card.image_url,
            parsedSet: item.card.set_code,
            isAltArt: item.is_foil,
            quantity: 1, 
            ids: [item.id] 
        });
      }
    });
    return Array.from(groups.values());
  }, [collection]);

  const handleDelete = (item: any) => {
    const idToDelete = item.ids[item.ids.length - 1];
    Alert.alert(
      'Gestionar carta',
      `¿Retirar ${item.code}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
            text: 'Eliminar', 
            style: 'destructive', 
            onPress: () => deleteCard(idToDelete) // Ahora sí funciona
        },
      ]
    );
  };

  const renderCardSlab = ({ item }: { item: any }) => (
    <Pressable 
      style={({pressed}) => [styles.slabContainer, pressed && styles.slabPressed]}
      onLongPress={() => handleDelete(item)}
      delayLongPress={300}
    >
      <View style={StyleSheet.absoluteFill}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderBg}>
            <Text style={{fontSize: 24, opacity: 0.3}}>⚓</Text>
          </View>
        )}
      </View>

      <LinearGradient
        colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0)']} 
        style={styles.topGradient}
      >
        <Text style={[styles.codeText, item.isAltArt && { color: PALETTE.gold }]}>
          {item.code}
        </Text>
        {item.isAltArt && <Text style={styles.starIcon}>★</Text>}
      </LinearGradient>

      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)', '#000000']} 
        locations={[0, 0.4, 0.9]}
        style={styles.bottomGradient}
      >
        <Text style={styles.setNameText}>
          {cardCodeParser.getSetName(item.parsedSet)}
        </Text>
        <Text style={styles.nameText} numberOfLines={2}>
          {truncateText(item.name, MAX_NAME_CHARS)}
        </Text>
      </LinearGradient>

      {item.quantity > 1 && (
        <View style={styles.qtyBadgeIntegrated}>
          <Text style={styles.qtyText}>x{item.quantity}</Text>
        </View>
      )}
      
      <View style={[
        styles.borderFrame, 
        item.isAltArt 
          ? { borderColor: PALETTE.gold, borderWidth: 1.5 } 
          : { borderColor: 'rgba(0,0,0,0.6)', borderWidth: 1 }
      ]} />
    </Pressable>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerTopRow}>
        <View>
          <Text style={styles.subTitle}>NAKAMAS</Text>
          <Text style={styles.mainTitle}>Collection</Text>
        </View>
      </View>

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

      <View style={styles.rarityScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 0}}>
          <View style={[styles.rarityChip, { borderColor: PALETTE.gold, backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
            <Text style={[styles.rarityCount, { color: PALETTE.gold }]}>{stats.altArts}</Text>
            <Text style={[styles.rarityLabel, { color: PALETTE.gold }]}>AA</Text>
          </View>

          {rarityStats.map(([rarity, count]) => (
            <View key={rarity} style={styles.rarityChip}>
              <Text style={styles.rarityCount}>{count}</Text>
              <Text style={styles.rarityLabel}>{rarity}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={[PALETTE.deepOcean, PALETTE.navy, '#1e4d6b']}
      style={styles.mainContainer}
    >
      <SafeAreaView style={{flex: 1}}>
        <StatusBar barStyle="light-content" />
        
        {loading && collection.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={PALETTE.cream} />
            <Text style={styles.loadingText}>Cargando...</Text>
          </View>
        ) : (
          <FlatList
            key={NUM_COLUMNS}
            data={groupedCollection} 
            keyExtractor={(item) => item.ids[0]}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={renderHeader}
            refreshing={loading}
            onRefresh={refresh}
            showsVerticalScrollIndicator={false}
            renderItem={renderCardSlab}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Text style={{fontSize: 40, opacity: 0.5, marginBottom: 10}}>🏴‍☠️</Text>
                <Text style={styles.emptyText}>Sin cartas aún</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, paddingTop: 40},
  listContent: { paddingHorizontal: GAP, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'flex-start', gap: GAP, marginBottom: GAP },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },

  // --- HEADER ---
  headerContainer: { marginTop: 10, marginBottom: 25, paddingHorizontal: 10 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  subTitle: { color: PALETTE.lightBlue, fontSize: 10, letterSpacing: 3, fontWeight: 'bold', marginBottom: 4 },
  mainTitle: { color: PALETTE.cream, fontSize: 36, fontWeight: '300', letterSpacing: 1 },

  // Stats Principales
  mainStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  statBoxMain: { flex: 1, alignItems: 'center' },
  statNumMain: { color: PALETTE.cream, fontSize: 20, fontWeight: 'bold' },
  statNumAlt: { color: PALETTE.gold, fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, marginTop: 2, fontWeight: '700' },
  statLabelAlt: { color: PALETTE.gold, fontSize: 9, marginTop: 2, fontWeight: '700' },
  verticalLine: { width: 1, height: '60%', backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center' },

  // Scroll de Rarezas
  rarityScrollContainer: {
    flexDirection: 'row',
  },
  rarityChip: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 45,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0, 48, 73, 0.5)',
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rarityCount: { color: PALETTE.cream, fontSize: 14, fontWeight: 'bold' },
  rarityLabel: { color: PALETTE.lightBlue, fontSize: 9, fontWeight: '700', marginTop: 1 },

  // --- CARTA (SLAB) ---
  slabContainer: {
    width: CARD_WIDTH,
    aspectRatio: 63 / 88, 
    borderRadius: 8,
    backgroundColor: '#000000',
    overflow: 'hidden', 
    position: 'relative',
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 6,
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

  topGradient: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 35, 
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 6, paddingTop: 6,
    zIndex: 2,
  },
  codeText: { 
    color: 'rgba(255,255,255,0.95)', 
    fontSize: 9, 
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 2
  },
  starIcon: { color: PALETTE.gold, fontSize: 10, fontWeight: 'bold' },

  bottomGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 70, 
    justifyContent: 'flex-end',
    paddingBottom: 10, 
    paddingHorizontal: 5,
    zIndex: 2,
  },
  setNameText: { 
    color: PALETTE.lightBlue, 
    fontSize: 7, 
    fontWeight: '700', 
    textAlign: 'center', 
    marginBottom: 2,
    opacity: 0.9 
  },
  nameText: { 
    color: PALETTE.cream, 
    fontSize: 9, 
    fontWeight: '600', 
    textAlign: 'center', 
    width: '100%',
    lineHeight: 12,
    textShadowColor: '#000', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3
  },

  qtyBadgeIntegrated: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: PALETTE.red,
    borderTopLeftRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 20, 
  },
  qtyText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  
  loadingText: { color: PALETTE.cream, marginTop: 10 },
  emptyText: { color: PALETTE.cream, fontSize: 16 },
});