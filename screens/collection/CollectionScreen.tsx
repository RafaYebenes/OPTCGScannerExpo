import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// COMPONENTES & CONTEXTOS
import { CardGridItem } from "../../components/collection/CardGridItem";
import { CollectionHeader } from "../../components/collection/CollectionHeader";
import { FilterModal } from "../../components/collection/FilterModal";
import { useCollection } from "../../context/CollectionContext";
import { deckService } from "../../services/deckService";
import { CollectionScreenProps } from "../../types/navigation.types";
import { PALETTE, SPACING } from "../../utils/theme";

const AVAILABLE_COLORS = ["Red", "Green", "Blue", "Purple", "Black", "Yellow"];

export const CollectionScreen: React.FC<CollectionScreenProps> = ({
  navigation,
}) => {
  const { collection, stats, loading, refresh, deleteCard } = useCollection();

  // ESTADOS
  const [searchText, setSearchText] = useState("");
  const [activeRarity, setActiveRarity] = useState<string | null>(null);

  // MODAL FILTROS
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterColor, setFilterColor] = useState<string | null>(null);
  const [filterSet, setFilterSet] = useState<string | null>(null);

  // MAZOS
  const [creatingDeck, setCreatingDeck] = useState(false);

  // 1. Ocultar cabecera nativa
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // --- SOLUCIÓN AL BUCLE INFINITO ---
  // Guardamos la función refresh en una referencia para que no dispare el efecto
  const refreshRef = useRef(refresh);

  // Actualizamos la referencia siempre que cambie la función
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // Usamos la referencia dentro de useFocusEffect
  useFocusEffect(
    useCallback(() => {
      // Llamamos a la versión más reciente de refresh sin añadirla a dependencias
      refreshRef.current();
    }, []), // Array vacío = Solo se ejecuta al enfocar la pantalla
  );
  // ----------------------------------

  // --- LÓGICA DE FILTRADO ---
  const filteredRawCollection = useMemo(() => {
    return collection.filter((item) => {
      if (!item.card) return false;

      // 1. Texto
      if (searchText) {
        const query = searchText.toUpperCase();
        const matchName = item.card.name.toUpperCase().includes(query);
        const matchCode = item.card.code.toUpperCase().includes(query);
        const matchSet = item.card.set_code.toUpperCase().includes(query);
        if (!matchName && !matchCode && !matchSet) return false;
      }

      // 2. Rareza
      if (activeRarity) {
        if (activeRarity === "AA") {
          if (!item.is_foil) return false;
        } else {
          const r = item.card.rarity ? item.card.rarity.toUpperCase() : "?";
          let label = r;
          if (r === "LEADER") label = "L";
          if (r === "COMMON") label = "C";
          if (r === "UNCOMMON") label = "UC";
          if (r === "RARE") label = "R";
          if (r === "SUPER RARE") label = "SR";
          if (r === "SECRET RARE") label = "SEC";
          if (r === "PROMO") label = "P";
          if (label !== activeRarity) return false;
        }
      }

      // 3. Color
      if (filterColor) {
        if (!item.card.color || !item.card.color.includes(filterColor))
          return false;
      }

      // 4. Set
      if (filterSet) {
        if (item.card.set_code !== filterSet) return false;
      }

      return true;
    });
  }, [collection, searchText, activeRarity, filterColor, filterSet]);

  // --- AGRUPACIÓN VISUAL ---
  const groupedDisplayCollection = useMemo(() => {
    const groups = new Map();
    filteredRawCollection.forEach((item) => {
      const key = `${item.card.code}-${item.is_foil}`;
      if (groups.has(key)) {
        const existing = groups.get(key);
        existing.quantity += 1;
        existing.ids.push(item.id);
      } else {
        groups.set(key, {
          ...item,
          code: item.card.code,
          name: item.card.name,
          image: item.card.image_url,
          parsedSet: item.card.set_code,
          isAltArt: item.is_foil,
          quantity: 1,
          ids: [item.id],
        });
      }
    });
    return Array.from(groups.values());
  }, [filteredRawCollection]);

  // --- STATS DE RAREZA ---
  const rarityStats = useMemo(() => {
    const counts: Record<string, number> = {};
    collection.forEach((item) => {
      const r = item.card?.rarity ? item.card.rarity.toUpperCase() : "?";
      let label = r;
      if (r === "LEADER") label = "L";
      if (r === "COMMON") label = "C";
      if (r === "UNCOMMON") label = "UC";
      if (r === "RARE") label = "R";
      if (r === "SUPER RARE") label = "SR";
      if (r === "SECRET RARE") label = "SEC";
      if (r === "PROMO") label = "P";
      counts[label] = (counts[label] || 0) + 1;
    });
    const sortOrder = ["L", "C", "UC", "R", "SR", "SEC", "P"];
    return Object.entries(counts).sort((a, b) => {
      const idxA = sortOrder.indexOf(a[0]);
      const idxB = sortOrder.indexOf(b[0]);
      if (idxA === -1 && idxB === -1) return a[0].localeCompare(b[0]);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [collection]);

  // Sets disponibles
  const availableSets = useMemo(() => {
    const sets = new Set(
      collection.map((i) => i.card?.set_code).filter(Boolean),
    );
    return Array.from(sets).sort();
  }, [collection]);

  const handleDelete = (item: any) => {
    const idToDelete = item.ids[item.ids.length - 1];
    Alert.alert("Gestionar carta", `¿Retirar ${item.code}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => deleteCard(idToDelete),
      },
    ]);
  };

  const clearAllFilters = () => {
    setFilterColor(null);
    setFilterSet(null);
    setActiveRarity(null);
    setSearchText("");
    setShowFilterModal(false);
  };

  // ✅ MAZOS: accesos rápidos
  const goToDecks = () => navigation.navigate("DecksList");

  const createDeckQuick = async () => {
    if (creatingDeck) return;
    setCreatingDeck(true);
    try {
      const deck = await deckService.createDeck("Nuevo mazo");
      navigation.navigate("DeckBuilder", { deckId: deck.id });
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "No se pudo crear el mazo");
    } finally {
      setCreatingDeck(false);
    }
  };

  return (
    <LinearGradient
      colors={[PALETTE.deepOcean, PALETTE.navy, "#1e4d6b"]}
      style={styles.mainContainer}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <StatusBar barStyle="light-content" />

        {loading && collection.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={PALETTE.cream} />
            <Text style={styles.loadingText}>Cargando...</Text>
          </View>
        ) : (
          <FlatList
            key={3}
            data={groupedDisplayCollection}
            keyExtractor={(item) => item.ids[0]}
            numColumns={3}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View>
                {/* ✅ Sección Mazos */}
                <View style={styles.decksSection}>
                  <Text style={styles.decksTitle}>Mazos</Text>
                  <Text style={styles.decksSub}>
                    Crea y valida mazos (51 cartas, colores por Leader, máximo 4
                    copias por código).
                  </Text>

                  <View style={styles.decksBtnsRow}>
                    <Pressable onPress={goToDecks} style={styles.decksBtnGhost}>
                      <Text style={styles.decksBtnGhostText}>Ir a Mazos</Text>
                    </Pressable>

                    <Pressable
                      onPress={createDeckQuick}
                      disabled={creatingDeck}
                      style={[
                        styles.decksBtnPrimary,
                        creatingDeck && { opacity: 0.6 },
                      ]}
                    >
                      <Text style={styles.decksBtnPrimaryText}>
                        {creatingDeck ? "Creando…" : "+ Crear mazo"}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Header existente */}
                <CollectionHeader
                  stats={stats}
                  searchText={searchText}
                  setSearchText={setSearchText}
                  onOpenFilters={() => setShowFilterModal(true)}
                  isFilterActive={!!filterColor || !!filterSet}
                  activeRarity={activeRarity}
                  setActiveRarity={setActiveRarity}
                  rarityStats={rarityStats}
                />
              </View>
            }
            refreshing={loading}
            onRefresh={refresh}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <CardGridItem
                item={item}
                onPress={(i) => navigation.navigate("CardDetail", { item: i })} //Esto funciona no borrar
                onLongPress={handleDelete}
              />
            )}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Text style={{ fontSize: 40, opacity: 0.5, marginBottom: 10 }}>
                  🏴‍☠️
                </Text>
                <Text style={styles.emptyText}>
                  {searchText || activeRarity || filterColor || filterSet
                    ? "No se encontraron cartas con esos filtros"
                    : "Sin cartas aún"}
                </Text>
              </View>
            }
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
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  listContent: { paddingHorizontal: SPACING.gap, paddingBottom: 100 },
  columnWrapper: {
    justifyContent: "flex-start",
    gap: SPACING.gap,
    marginBottom: SPACING.gap,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  loadingText: { color: PALETTE.cream, marginTop: 10 },
  emptyText: {
    color: PALETTE.cream,
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },

  // ✅ Mazos section
  decksSection: {
    backgroundColor: PALETTE.glass,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE.glassBorder,
    marginTop: SPACING.gap,
    marginBottom: SPACING.gap,
  },
  decksTitle: { color: PALETTE.cream, fontWeight: "900", fontSize: 16 },
  decksSub: { color: PALETTE.textDim, marginTop: 6, lineHeight: 18 },

  decksBtnsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  decksBtnGhost: {
    flex: 1,
    backgroundColor: PALETTE.whiteTransparent,
    borderWidth: 1,
    borderColor: PALETTE.glassBorder,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  decksBtnGhostText: { color: PALETTE.cream, fontWeight: "900" },

  decksBtnPrimary: {
    flex: 1,
    backgroundColor: PALETTE.cream,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  decksBtnPrimaryText: { color: PALETTE.deepOcean, fontWeight: "900" },
});
