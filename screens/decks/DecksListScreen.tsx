import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useLayoutEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";

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
      Alert.alert("Error", e?.message ?? "No se pudieron cargar los mazos");
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
      Alert.alert("Error", e?.message ?? "No se pudo crear el mazo");
    }
  };

  const onOpen = (deckId: string) => {
    navigation.navigate("DeckBuilder", { deckId });
  };

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
            Alert.alert("Error", e?.message ?? "No se pudo eliminar");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[PALETTE.navy, PALETTE.deepOcean]}
        style={styles.bg}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Mazos</Text>
          <Pressable
            onPress={() => navigation.navigate("Collection")}
            style={styles.headerBtn}
          >
            <Text style={styles.headerBtnText}>Volver</Text>
          </Pressable>
        </View>

        <Pressable onPress={onCreate} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>+ Nuevo mazo</Text>
        </Pressable>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={PALETTE.cream} />
          </View>
        ) : (
          <FlatList
            data={decks}
            keyExtractor={(d) => d.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onOpen(item.id)}
                onLongPress={() => onDelete(item.id)}
                style={styles.card}
              >
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>
                  Actualizado: {new Date(item.updated_at).toLocaleString()}
                </Text>
                <Text style={styles.cardHint}>
                  Mantén pulsado para eliminar
                </Text>
              </Pressable>
            )}
          />
        )}
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.deepOcean },
  bg: { flex: 1, padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: PALETTE.cream, fontSize: 22, fontWeight: "900" },
  headerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: PALETTE.whiteTransparent,
    borderWidth: 1,
    borderColor: PALETTE.glassBorder,
  },
  headerBtnText: { color: PALETTE.cream, fontWeight: "800" },

  primaryBtn: {
    marginTop: SPACING.gap,
    backgroundColor: PALETTE.cream,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: PALETTE.deepOcean, fontWeight: "900" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    marginTop: SPACING.gap,
    backgroundColor: PALETTE.glass,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE.glassBorder,
  },
  cardTitle: { color: PALETTE.cream, fontWeight: "900", fontSize: 16 },
  cardMeta: { color: PALETTE.textDim, marginTop: 6 },
  cardHint: { color: PALETTE.textDim, marginTop: 8, fontSize: 12 },
});
