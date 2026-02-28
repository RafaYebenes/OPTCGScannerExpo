import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useLayoutEffect, useState } from "react";
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

import { DeckRow, deckService } from "../../services/deckService";
import { DecksListScreenNavigationProp } from "../../types/navigation.types";
import { PALETTE, SPACING } from "../../utils/theme";

export const DecksListScreen: React.FC = () => {
  const navigation = useNavigation<DecksListScreenNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [decks, setDecks] = useState<DeckRow[]>([]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await deckService.listDecks();
      setDecks(data);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "No se pudieron cargar los mazos");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onCreate = async () => {
    try {
      const deck = await deckService.createDeck("Nuevo mazo");
      navigation.navigate("DeckBuilder", { deckId: deck.id });
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "No se pudo crear el mazo");
    }
  };

  const onOpen = (deckId: string) =>
    navigation.navigate("DeckBuilder", { deckId });

  const onDelete = (deckId: string) => {
    Alert.alert("Eliminar mazo", "¿Seguro que quieres eliminar este mazo?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await deckService.deleteDeck(deckId);
            load();
          } catch (e: any) {
            Alert.alert("Error", e.message ?? "No se pudo eliminar");
          }
        },
      },
    ]);
  };

  return (
    <LinearGradient
      colors={[PALETTE.deepOcean, PALETTE.navy, "#1e4d6b"]}
      style={styles.mainContainer}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <StatusBar barStyle="light-content" />

        <View style={styles.headerRow}>
          <Text style={styles.title}>Mazos</Text>
          <Pressable onPress={onCreate} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>+ Nuevo</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={PALETTE.cream} />
            <Text style={styles.dimText}>Cargando...</Text>
          </View>
        ) : (
          <FlatList
            data={decks}
            keyExtractor={(d) => d.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={{ fontSize: 40, opacity: 0.6, marginBottom: 10 }}>
                  🃏
                </Text>
                <Text style={styles.emptyText}>Aún no tienes mazos</Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onOpen(item.id)}
                onLongPress={() => onDelete(item.id)}
                style={styles.card}
              >
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSub}>
                  Actualizado: {new Date(item.updated_at).toLocaleString()}
                </Text>
                <Text style={styles.cardHint}>
                  Mantén pulsado para eliminar
                </Text>
              </Pressable>
            )}
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
  title: { color: PALETTE.cream, fontSize: 22, fontWeight: "900" },
  primaryBtn: {
    backgroundColor: PALETTE.cream,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryBtnText: { color: PALETTE.deepOcean, fontWeight: "900" },
  listContent: { paddingHorizontal: SPACING.gap, paddingBottom: 24 },
  card: {
    backgroundColor: PALETTE.glass,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE.glassBorder,
    marginBottom: SPACING.gap,
  },
  cardTitle: { color: PALETTE.cream, fontWeight: "900", fontSize: 16 },
  cardSub: { color: PALETTE.cream, opacity: 0.85, marginTop: 6 },
  cardHint: { color: PALETTE.textDim, marginTop: 8, fontSize: 12 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  dimText: { color: PALETTE.textDim, marginTop: 10 },
  emptyText: { color: PALETTE.cream, fontSize: 16, textAlign: "center" },
});
