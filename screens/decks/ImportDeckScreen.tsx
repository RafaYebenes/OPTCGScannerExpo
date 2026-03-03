// src/screens/decks/ImportDeckScreen.tsx
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCollection } from "../../context/CollectionContext";
import { deckService } from "../../services/deckService";
import { deckStore } from "../../services/deckStore";
import type { CardRow } from "../../types/deck.types";
import { ImportDeckScreenNavigationProp } from "../../types/navigation.types";
import { parseDecklistText, resolveDeckImport } from "../../utils/deckImport";
import { PALETTE, SPACING } from "../../utils/theme";

const useDebouncedValue = <T,>(value: T, delayMs: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
};

export const ImportDeckScreen: React.FC = () => {
  const navigation = useNavigation<ImportDeckScreenNavigationProp>();

  const { cardCatalog, catalogLoading, loadCardCatalog } = useCollection();

  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const debouncedText = useDebouncedValue(text, 220);

  const [importing, setImporting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (cardCatalog.length === 0 && !catalogLoading) {
      loadCardCatalog().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardCatalog.length, catalogLoading]);

  const parsed = useMemo(
    () => parseDecklistText(debouncedText),
    [debouncedText],
  );

  const resolved = useMemo(() => {
    return resolveDeckImport(
      parsed,
      (cardCatalog as unknown as CardRow[]) ?? [],
      name.trim() || undefined,
    );
  }, [parsed, cardCatalog, name]);

  const canImport =
    !importing &&
    (cardCatalog.length > 0 || !catalogLoading) &&
    resolved.errors.length === 0 &&
    resolved.missing.length === 0 &&
    Boolean(resolved.leader);

  const showSpinner = catalogLoading && cardCatalog.length === 0;

  const onImport = async () => {
    if (!canImport) return;

    setImporting(true);
    try {
      const deck = await deckService.importDeck(text, cardCatalog as any, {
        name: name.trim() || undefined,
      });

      try {
        const detail = await deckService.getDeck(deck.id);
        deckStore.set(deck.id, detail);
      } catch {}

      navigation.navigate("DeckBuilder", { deckId: deck.id });
    } catch (e: any) {
      Alert.alert("Importación fallida", e.message ?? "No se pudo importar");
    } finally {
      setImporting(false);
    }
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
          <Text style={styles.title}>Importar mazo</Text>
          <View style={{ width: 30 }} />
        </View>

        {showSpinner ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={PALETTE.cream} />
            <Text style={styles.dimText}>Cargando catálogo...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Nombre del mazo</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ej: Zoro Aggro"
                placeholderTextColor={PALETTE.textDim}
                style={styles.input}
                autoCorrect={false}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pega la decklist</Text>
              <Text style={styles.hint}>
                Soporta: <Text style={styles.mono}>4x OP01-001 Nombre</Text>{" "}
                (OPTD),
                <Text style={styles.mono}> 4 OP01-001 Nombre</Text> (Limitless),
                y JSON propio. Marca el leader con{" "}
                <Text style={styles.mono}>[Leader]</Text> si hace falta.
              </Text>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={`Ej:\n1 OP01-001 Roronoa Zoro [Leader]\n4 OP01-025 Nami\n...`}
                placeholderTextColor={PALETTE.textDim}
                style={[styles.input, styles.textArea]}
                autoCorrect={false}
                autoCapitalize="characters"
                multiline
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Preview</Text>

              <View style={styles.row}>
                <Text style={styles.label}>Leader:</Text>
                <Text style={styles.value}>
                  {resolved.leader
                    ? `${resolved.leader.code} — ${resolved.leader.name}`
                    : "No detectado"}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Main deck:</Text>
                <Text style={styles.value}>{resolved.stats.mainCount}/50</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Total:</Text>
                <Text style={styles.value}>{resolved.stats.total}/51</Text>
              </View>

              {resolved.warnings.length > 0 && (
                <View style={styles.block}>
                  <Text style={styles.warnTitle}>Avisos</Text>
                  {resolved.warnings.slice(0, 6).map((w, idx) => (
                    <Text key={idx} style={styles.warnText}>
                      • {w}
                    </Text>
                  ))}
                </View>
              )}

              {resolved.missing.length > 0 && (
                <View style={styles.block}>
                  <Text style={styles.errTitle}>Cartas no encontradas</Text>
                  {resolved.missing.slice(0, 12).map((m, idx) => (
                    <Text key={idx} style={styles.errText}>
                      • {m.quantity}x {m.code} {m.name ? `— ${m.name}` : ""}
                    </Text>
                  ))}
                  {resolved.missing.length > 12 && (
                    <Text style={styles.dimText}>
                      (+{resolved.missing.length - 12} más)
                    </Text>
                  )}
                </View>
              )}

              {resolved.errors.length > 0 && (
                <View style={styles.block}>
                  <Text style={styles.errTitle}>Errores</Text>
                  {resolved.errors.slice(0, 10).map((err, idx) => (
                    <Text key={idx} style={styles.errText}>
                      • {err}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            <Pressable
              onPress={onImport}
              disabled={!canImport}
              style={[
                styles.primaryBtn,
                (!canImport || importing) && styles.primaryBtnDisabled,
              ]}
            >
              <Text style={styles.primaryBtnText}>
                {importing ? "Importando..." : "Importar mazo"}
              </Text>
            </Pressable>

            <View style={{ height: 18 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  content: { paddingHorizontal: SPACING.gap, paddingBottom: 24 },
  headerRow: {
    paddingHorizontal: SPACING.gap,
    paddingTop: SPACING.gap,
    paddingBottom: SPACING.gap,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: PALETTE.cream, fontSize: 22, fontWeight: "900" },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PALETTE.whiteTransparent,
    borderWidth: 1,
    borderColor: PALETTE.glassBorder,
  },
  backText: { color: PALETTE.cream, fontSize: 16, fontWeight: "900" },

  card: {
    backgroundColor: PALETTE.glass,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE.glassBorder,
    marginBottom: SPACING.gap,
  },
  cardTitle: { color: PALETTE.cream, fontWeight: "900", fontSize: 16 },
  hint: { color: PALETTE.cream, opacity: 0.85, marginTop: 8, marginBottom: 10 },
  mono: { fontFamily: "monospace", color: PALETTE.cream },

  input: {
    marginTop: 10,
    backgroundColor: PALETTE.whiteTransparent,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: PALETTE.glassBorder,
    color: PALETTE.cream,
  },
  textArea: { minHeight: 180, textAlignVertical: "top" },

  row: { flexDirection: "row", marginTop: 10 },
  label: { width: 90, color: PALETTE.textDim, fontWeight: "800" },
  value: { flex: 1, color: PALETTE.cream, fontWeight: "700" },

  block: { marginTop: 12 },
  warnTitle: { color: PALETTE.gold, fontWeight: "900", marginBottom: 6 },
  warnText: { color: PALETTE.cream, opacity: 0.9, marginBottom: 4 },
  errTitle: { color: PALETTE.red, fontWeight: "900", marginBottom: 6 },
  errText: { color: PALETTE.cream, opacity: 0.9, marginBottom: 4 },

  primaryBtn: {
    backgroundColor: PALETTE.cream,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: PALETTE.deepOcean, fontWeight: "900" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  dimText: { color: PALETTE.textDim, marginTop: 10, textAlign: "center" },
});
