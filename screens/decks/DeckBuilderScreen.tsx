import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DeckCardTile } from "../../components/decks/DeckCardTile";
import {
  DeckCardRow,
  DeckDetail,
  deckRules,
  deckService,
} from "../../services/deckService";
import { deckStore } from "../../services/deckStore";
import {
  DeckBuilderScreenNavigationProp,
  DeckBuilderScreenRouteProp,
} from "../../types/navigation.types";
import { PALETTE, SPACING } from "../../utils/theme";

export const DeckBuilderScreen: React.FC = () => {
  const navigation = useNavigation<DeckBuilderScreenNavigationProp>();
  const route = useRoute<DeckBuilderScreenRouteProp>();
  const { deckId } = route.params;

  const [detail, setDetail] = useState<DeckDetail | null>(null);
  const [name, setName] = useState("");
  const [pending, setPending] = useState<Record<string, boolean>>({});

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // subscribe store
  useEffect(() => {
    const unsub = deckStore.subscribe(deckId, (d) => {
      if (d) {
        setDetail(d);
        setName(d.deck.name);
      }
    });
    return unsub;
  }, [deckId]);

  // initial load (once)
  useEffect(() => {
    (async () => {
      if (deckStore.get(deckId)) return;
      try {
        const d = await deckService.getDeck(deckId);
        deckStore.set(deckId, d);
      } catch (e: any) {
        Alert.alert("Error", e.message ?? "No se pudo cargar el mazo");
        navigation.goBack();
      }
    })();
  }, [deckId, navigation]);

  const mainCount = useMemo(() => {
    if (!detail) return 0;
    return detail.cards.reduce((acc, dc) => acc + (dc.quantity ?? 0), 0);
  }, [detail]);

  const countsByCode = useMemo(() => {
    const map = new Map<string, number>();
    if (!detail) return map;
    for (const dc of detail.cards) {
      const code = dc.card?.code;
      if (!code) continue;
      map.set(code, (map.get(code) ?? 0) + dc.quantity);
    }
    return map;
  }, [detail]);

  const validation = useMemo(
    () => (detail ? deckRules.validate(detail) : null),
    [detail],
  );

  const onSaveName = async () => {
    if (!detail) return;
    try {
      const trimmed = name.trim();
      if (trimmed.length < 3) {
        Alert.alert("Nombre inválido", "Mínimo 3 caracteres.");
        return;
      }
      deckStore.update(deckId, (prev) => ({
        ...prev,
        deck: { ...prev.deck, name: trimmed },
      }));
      await deckService.renameDeck(deckId, trimmed);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "No se pudo guardar el nombre");
    }
  };

  const onChooseLeader = () =>
    navigation.navigate("CardSelector", { deckId, mode: "leader" });

  const onAddCards = () => {
    if (!detail?.leader) {
      Alert.alert("Selecciona Leader", "Primero elige un Leader.");
      return;
    }
    navigation.navigate("CardSelector", { deckId, mode: "main" });
  };

  const onValidate = () => {
    if (!detail) return;
    const v = deckRules.validate(detail);
    if (v.ok) Alert.alert("✅ Mazo válido", "51 cartas (Leader + 50).");
    else Alert.alert("❌ Mazo inválido", v.errors.join("\n"));
  };

  const applyQtyLocal = (
    prev: DeckDetail,
    cardId: string,
    nextQty: number,
  ): DeckDetail => {
    const idx = prev.cards.findIndex((c) => c.card_id === cardId);

    if (nextQty <= 0) {
      if (idx === -1) return prev;
      const nextCards = prev.cards.slice();
      nextCards.splice(idx, 1);
      return { ...prev, cards: nextCards };
    }

    if (idx !== -1) {
      const nextCards = prev.cards.slice();
      nextCards[idx] = { ...nextCards[idx], quantity: Math.min(4, nextQty) };
      return { ...prev, cards: nextCards };
    }

    return prev;
  };

  const setQty = async (row: DeckCardRow, nextQty: number) => {
    if (!detail) return;
    const cardId = row.card_id;
    if (pending[cardId]) return;

    // guard main deck 50
    if (nextQty > row.quantity && mainCount >= 50) {
      Alert.alert("Límite", "El main deck ya tiene 50 cartas.");
      return;
    }

    // guard max 4 por code (Normal+Parallel suman)
    const code = row.card?.code;
    if (code && nextQty > row.quantity) {
      const totalByCode = countsByCode.get(code) ?? 0;
      const would = totalByCode - row.quantity + nextQty;
      if (would > 4) {
        Alert.alert("Límite", `Máximo 4 copias por carta (${code}).`);
        return;
      }
    }

    const snapshot = detail;
    setPending((p) => ({ ...p, [cardId]: true }));

    deckStore.update(deckId, (prev) => applyQtyLocal(prev, cardId, nextQty));

    try {
      await deckService.writeDeckCardQuantity(deckId, cardId, nextQty);
    } catch (e: any) {
      deckStore.set(deckId, snapshot);
      Alert.alert("Error", e.message ?? "No se pudo actualizar la carta");
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[cardId];
        return next;
      });
    }
  };

  if (!detail) {
    return (
      <LinearGradient
        colors={[PALETTE.deepOcean, PALETTE.navy, "#1e4d6b"]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
          <StatusBar barStyle="light-content" />
          <View style={styles.center}>
            <Text style={{ color: PALETTE.textDim }}>Cargando…</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const leader = detail.leader;

  return (
    <LinearGradient
      colors={[PALETTE.deepOcean, PALETTE.navy, "#1e4d6b"]}
      style={styles.mainContainer}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <StatusBar barStyle="light-content" />

        {/* Header fijo (solo back/title/validar) */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.title}>Deck Builder</Text>
          <Pressable onPress={onValidate} style={styles.validateBtn}>
            <Text style={styles.validateText}>Validar</Text>
          </Pressable>
        </View>

        {/* ✅ Un único scroll: FlatList con Header scrolleable */}
        <FlatList
          data={detail.cards}
          keyExtractor={(it) => it.card_id}
          numColumns={3}
          columnWrapperStyle={{
            gap: SPACING.gap,
            paddingHorizontal: SPACING.gap,
          }}
          contentContainerStyle={{ gap: SPACING.gap, paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          windowSize={9}
          initialNumToRender={18}
          maxToRenderPerBatch={24}
          ListHeaderComponent={
            <View
              style={{
                paddingHorizontal: SPACING.gap,
                paddingBottom: SPACING.gap,
              }}
            >
              {/* Nombre */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Nombre</Text>
                <View style={styles.row}>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Nombre del mazo"
                    placeholderTextColor={PALETTE.textDim}
                    style={styles.input}
                  />
                  <Pressable onPress={onSaveName} style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>Guardar</Text>
                  </Pressable>
                </View>
              </View>

              {/* ✅ Leader compacto */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Leader</Text>
                  <Pressable onPress={onChooseLeader} style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>
                      {leader ? "Cambiar" : "Elegir"}
                    </Text>
                  </Pressable>
                </View>

                {!leader ? (
                  <Text style={{ color: PALETTE.textDim, marginTop: 10 }}>
                    No hay leader seleccionado.
                  </Text>
                ) : (
                  <Pressable
                    onPress={onChooseLeader}
                    style={styles.leaderCompactRow}
                  >
                    <View style={styles.leaderThumbWrap}>
                      {leader.image_url ? (
                        <Image
                          source={{ uri: leader.image_url }}
                          style={styles.leaderThumb}
                        />
                      ) : (
                        <View
                          style={[
                            styles.leaderThumb,
                            { justifyContent: "center", alignItems: "center" },
                          ]}
                        >
                          <Text style={{ opacity: 0.5 }}>⚓</Text>
                        </View>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.leaderName} numberOfLines={1}>
                        {leader.name}
                      </Text>
                      <Text style={styles.leaderMeta} numberOfLines={1}>
                        {leader.code} • {leader.color ?? "Sin color"} •{" "}
                        {leader.variant ?? "Normal"}
                      </Text>
                    </View>
                  </Pressable>
                )}
              </View>

              {/* Main Deck */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Main Deck</Text>
                  <Pressable
                    onPress={onAddCards}
                    style={[styles.primaryBtn, !leader && { opacity: 0.5 }]}
                  >
                    <Text style={styles.primaryBtnText}>+ Añadir</Text>
                  </Pressable>
                </View>

                <Text style={styles.countText}>
                  {mainCount}/50 • Total {(leader ? 1 : 0) + mainCount}/51
                </Text>
                {!validation?.ok && (
                  <Text style={styles.dimText}>
                    Hay errores pendientes. Pulsa “Validar”.
                  </Text>
                )}
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const c = item.card;
            const code = c?.code ?? "";
            const totalByCode = code ? (countsByCode.get(code) ?? 0) : 0;

            const disableMinus = pending[item.card_id] || item.quantity <= 0;
            const disablePlus =
              pending[item.card_id] ||
              mainCount >= 50 ||
              (code
                ? totalByCode - item.quantity + (item.quantity + 1) > 4
                : false);

            return (
              <DeckCardTile
                imageUri={c?.image_url ?? null}
                code={c?.code ?? "??"}
                variant={c?.variant ?? "Normal"}
                quantity={item.quantity}
                showActions
                disableMinus={disableMinus}
                disablePlus={disablePlus}
                onMinus={() => setQty(item, item.quantity - 1)}
                onPlus={() => setQty(item, item.quantity + 1)}
              />
            );
          }}
          ListEmptyComponent={
            <View style={{ paddingHorizontal: SPACING.gap, paddingTop: 10 }}>
              <Text style={{ color: PALETTE.textDim }}>
                Aún no has añadido cartas.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  headerRow: {
    paddingHorizontal: SPACING.gap,
    paddingTop: SPACING.gap,
    paddingBottom: SPACING.gap,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  backText: { color: PALETTE.cream, fontSize: 20, fontWeight: "900" },
  title: { color: PALETTE.cream, fontSize: 18, fontWeight: "900" },
  validateBtn: {
    backgroundColor: PALETTE.whiteTransparent,
    borderWidth: 1,
    borderColor: PALETTE.glassBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  validateText: { color: PALETTE.cream, fontWeight: "900" },

  section: {
    backgroundColor: PALETTE.glass,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE.glassBorder,
    marginBottom: SPACING.gap,
  },
  sectionTitle: { color: PALETTE.cream, fontWeight: "900", fontSize: 14 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  row: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  input: {
    flex: 1,
    backgroundColor: PALETTE.whiteTransparent,
    borderWidth: 1,
    borderColor: PALETTE.glassBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: PALETTE.cream,
  },
  primaryBtn: {
    backgroundColor: PALETTE.cream,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryBtnText: { color: PALETTE.deepOcean, fontWeight: "900" },

  countText: { color: PALETTE.cream, marginTop: 10, fontWeight: "900" },
  dimText: { color: PALETTE.textDim, marginTop: 6 },

  leaderCompactRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: PALETTE.whiteTransparent,
    borderWidth: 1,
    borderColor: PALETTE.glassBorder,
    borderRadius: 12,
    padding: 10,
  },
  leaderThumbWrap: {
    width: 64,
    aspectRatio: 63 / 88,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  leaderThumb: { width: "100%", height: "100%" },
  leaderName: { color: PALETTE.cream, fontWeight: "900", fontSize: 16 },
  leaderMeta: { color: PALETTE.textDim, marginTop: 4 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
