import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
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
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DeckCardTile } from "../../components/decks/DeckCardTile";
import { supabase } from "../../lib/supabase";
import { deckService } from "../../services/deckService";
import { deckStore } from "../../services/deckStore";
import {
  CardSelectorScreenNavigationProp,
  CardSelectorScreenRouteProp,
} from "../../types/navigation.types";
import { PALETTE, SPACING } from "../../utils/theme";

type CardPick = {
  id: string;
  code: string;
  name: string;
  color: string | null;
  type: string | null;
  variant: string | null;
  image_url: string | null;
};

const normalizeColors = (raw: string | null | undefined): string[] => {
  if (!raw) return [];
  return raw
    .split(/[\/,]/g)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
};

const colorsSubsetOfLeader = (
  leaderColor: string | null | undefined,
  cardColor: string | null | undefined,
) => {
  const leader = new Set(normalizeColors(leaderColor));
  const card = normalizeColors(cardColor);
  if (leader.size === 0 || card.length === 0) return true;
  return card.every((c) => leader.has(c));
};

export const CardSelectorScreen: React.FC = () => {
  const navigation = useNavigation<CardSelectorScreenNavigationProp>();
  const route = useRoute<CardSelectorScreenRouteProp>();
  const { deckId, mode } = route.params;

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<CardPick[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Sub al store (para ver counts instantáneos)
  useEffect(() => {
    const unsub = deckStore.subscribe(deckId, (d) => setDetail(d));
    return unsub;
  }, [deckId]);

  // Si no hay cache, fetch 1 vez
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

  const leaderColor = detail?.leader?.color ?? null;

  const countsByCode = useMemo(() => {
    const map = new Map<string, number>();
    if (!detail) return map;
    for (const dc of detail.cards ?? []) {
      const code = dc.card?.code;
      if (!code) continue;
      map.set(code, (map.get(code) ?? 0) + dc.quantity);
    }
    return map;
  }, [detail]);

  const qtyByCardId = useMemo(() => {
    const map = new Map<string, number>();
    if (!detail) return map;
    for (const dc of detail.cards ?? []) map.set(dc.card_id, dc.quantity);
    return map;
  }, [detail]);

  const mainCount = useMemo(() => {
    if (!detail) return 0;
    return (detail.cards ?? []).reduce(
      (acc: number, dc: any) => acc + (dc.quantity ?? 0),
      0,
    );
  }, [detail]);

  const title = mode === "leader" ? "Selecciona Leader" : "Añadir cartas";

  const search = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("cards")
        .select("id,code,name,color,type,variant,image_url")
        .limit(120)
        .order("code", { ascending: true });

      if (mode === "leader") query = query.eq("type", "LEADER");
      else query = query.neq("type", "LEADER");

      const qq = q.trim();
      if (qq.length >= 2)
        query = query.or(`name.ilike.%${qq}%,code.ilike.%${qq}%`);

      const { data, error } = await query;
      if (error) throw error;

      let list = (data ?? []) as CardPick[];

      // UX: si main y hay leader → solo compatibles
      if (mode === "main" && leaderColor) {
        list = list.filter((c) => colorsSubsetOfLeader(leaderColor, c.color));
      }

      setCards(list);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "No se pudo buscar");
    } finally {
      setLoading(false);
    }
  }, [q, mode, leaderColor]);

  useEffect(() => {
    search();
  }, []);

  const setLeaderLocal = async (card: CardPick) => {
    if (pending[card.id]) return;
    setPending((p) => ({ ...p, [card.id]: true }));

    // Optimista: actualiza store para que builder lo vea al volver
    const snapshot = detail;
    deckStore.update(deckId, (prev) => ({
      ...prev,
      deck: { ...prev.deck, leader_card_id: card.id },
      leader: {
        id: card.id,
        code: card.code,
        name: card.name,
        color: card.color,
        type: "LEADER",
        variant: card.variant,
        image_url: card.image_url,
      },
    }));

    try {
      await deckService.setLeaderFast(deckId, card.id);
      navigation.goBack();
    } catch (e: any) {
      if (snapshot) deckStore.set(deckId, snapshot);
      Alert.alert("Error", e.message ?? "No se pudo guardar el leader");
      setPending((p) => {
        const next = { ...p };
        delete next[card.id];
        return next;
      });
    }
  };

  const addMainLocal = async (card: CardPick) => {
    if (!detail?.leader) {
      Alert.alert("Selecciona Leader", "Primero elige un Leader.");
      return;
    }
    if (pending[card.id]) return;

    // Guard: main deck 50
    if (mainCount >= 50) {
      Alert.alert("Límite", "El main deck ya tiene 50 cartas.");
      return;
    }

    // Guard: colores (por seguridad, aunque ya filtramos)
    if (!colorsSubsetOfLeader(leaderColor, card.color)) {
      Alert.alert(
        "Color inválido",
        `No compatible con leader (${leaderColor ?? "?"}).`,
      );
      return;
    }

    // Guard: max 4 por code (Normal+Parallel suman)
    const currentByCode = countsByCode.get(card.code) ?? 0;
    if (currentByCode >= 4) {
      Alert.alert("Límite", `Máximo 4 copias por carta (${card.code}).`);
      return;
    }

    const currentQtyRow = qtyByCardId.get(card.id) ?? 0;
    const nextQty = currentQtyRow + 1;

    setPending((p) => ({ ...p, [card.id]: true }));
    const snapshot = detail;

    // Optimista: actualiza store sin fetch
    deckStore.update(deckId, (prev) => {
      const cardsArr = [...prev.cards];
      const idx = cardsArr.findIndex((dc) => dc.card_id === card.id);

      if (idx === -1) {
        cardsArr.push({
          id: card.id, // placeholder
          deck_id: deckId,
          card_id: card.id,
          quantity: 1,
          card: {
            id: card.id,
            code: card.code,
            name: card.name,
            color: card.color,
            type: card.type,
            variant: card.variant,
            image_url: card.image_url,
          },
        });
      } else {
        cardsArr[idx] = { ...cardsArr[idx], quantity: nextQty };
      }

      return { ...prev, cards: cardsArr };
    });

    try {
      await deckService.writeDeckCardQuantity(deckId, card.id, nextQty);
    } catch (e: any) {
      if (snapshot) deckStore.set(deckId, snapshot);
      Alert.alert("Error", e.message ?? "No se pudo añadir");
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[card.id];
        return next;
      });
    }
  };

  const onPick = (card: CardPick) => {
    if (mode === "leader") return setLeaderLocal(card);
    return addMainLocal(card);
  };

  return (
    <LinearGradient
      colors={[PALETTE.deepOcean, PALETTE.navy, "#1e4d6b"]}
      style={styles.mainContainer}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <StatusBar barStyle="light-content" />

        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <View style={{ width: 30 }} />
        </View>

        <View style={styles.searchRow}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscar por nombre o código (min 2)"
            placeholderTextColor={PALETTE.textDim}
            style={styles.input}
          />
          <Pressable onPress={search} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Buscar</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={PALETTE.cream} />
            <Text style={styles.dimText}>Buscando…</Text>
          </View>
        ) : (
          <FlatList
            data={cards}
            keyExtractor={(it) => it.id}
            numColumns={3}
            columnWrapperStyle={{
              gap: SPACING.gap,
              paddingHorizontal: SPACING.gap,
            }}
            contentContainerStyle={{ gap: SPACING.gap, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            windowSize={9}
            initialNumToRender={24}
            maxToRenderPerBatch={36}
            renderItem={({ item }) => {
              const current = countsByCode.get(item.code) ?? 0;
              const badge = mode === "main" ? `${current}/4` : undefined;
              const disabled = mode === "main" && current >= 4;

              return (
                <View style={{ opacity: disabled ? 0.55 : 1 }}>
                  <DeckCardTile
                    imageUri={item.image_url}
                    code={item.code}
                    variant={item.variant}
                    badgeText={badge}
                    onPress={() => onPick(item)}
                  />
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={{ fontSize: 40, opacity: 0.6, marginBottom: 10 }}>
                  🔎
                </Text>
                <Text style={styles.emptyText}>
                  {q.trim().length >= 2
                    ? "Sin resultados"
                    : "Escribe al menos 2 caracteres"}
                </Text>
              </View>
            }
          />
        )}
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

  searchRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: SPACING.gap,
    paddingBottom: SPACING.gap,
  },
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

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  dimText: { color: PALETTE.textDim, marginTop: 10 },
  emptyText: { color: PALETTE.cream, fontSize: 16, textAlign: "center" },
});
