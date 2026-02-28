import React from "react";
import {
    Dimensions,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { PALETTE, SPACING } from "../../utils/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const NUM_COLUMNS = 3;
const CARD_WIDTH =
  (SCREEN_WIDTH - SPACING.gap * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

type Props = {
  imageUri?: string | null;
  code: string;
  variant?: string | null; // Normal / Parallel
  quantity?: number; // para builder
  badgeText?: string; // por ejemplo "2/4" en selector
  onPress?: () => void;

  // Actions (builder)
  showActions?: boolean;
  onMinus?: () => void;
  onPlus?: () => void;
  disableMinus?: boolean;
  disablePlus?: boolean;
};

export const DeckCardTile: React.FC<Props> = React.memo(
  ({
    imageUri,
    code,
    variant,
    quantity,
    badgeText,
    onPress,
    showActions,
    onMinus,
    onPlus,
    disableMinus,
    disablePlus,
  }) => {
    const isParallel = (variant ?? "").toLowerCase() === "parallel";

    return (
      <Pressable
        style={({ pressed }) => [
          styles.slabContainer,
          pressed && styles.slabPressed,
        ]}
        onPress={onPress}
      >
        {/* IMAGEN */}
        <View style={StyleSheet.absoluteFill}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderBg}>
              <Text style={{ fontSize: 24, opacity: 0.3 }}>⚓</Text>
            </View>
          )}
        </View>

        {/* BORDE */}
        <View
          style={[
            styles.borderFrame,
            isParallel
              ? { borderColor: PALETTE.gold, borderWidth: 2 }
              : { borderColor: "rgba(255,255,255,0.1)", borderWidth: 1 },
          ]}
        />

        {/* STAR Parallel */}
        {isParallel && (
          <View style={styles.altArtStarContainer}>
            <Text style={styles.starText}>★</Text>
          </View>
        )}

        {/* Badge top-left (selector: 2/4) */}
        {!!badgeText && (
          <View style={styles.topBadge}>
            <Text style={styles.topBadgeText}>{badgeText}</Text>
          </View>
        )}

        {/* Badge bottom (code + qty) */}
        <View
          style={[styles.glassBadge, isParallel && styles.glassBadgeParallel]}
        >
          <Text style={styles.codeText}>{code}</Text>
          {!!quantity && quantity > 1 && (
            <>
              <View style={styles.separator} />
              <Text style={styles.qtyText}>x{quantity}</Text>
            </>
          )}
        </View>

        {/* Actions bottom bar (builder) */}
        {showActions && (
          <View style={styles.actionsBar}>
            <Pressable
              onPress={onMinus}
              disabled={disableMinus}
              style={[styles.actionBtn, disableMinus && { opacity: 0.4 }]}
            >
              <Text style={styles.actionText}>-</Text>
            </Pressable>

            <View style={styles.actionCenter}>
              <Text style={styles.actionQty}>{quantity ?? 0}</Text>
            </View>

            <Pressable
              onPress={onPlus}
              disabled={disablePlus}
              style={[styles.actionBtn, disablePlus && { opacity: 0.4 }]}
            >
              <Text style={styles.actionText}>+</Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  slabContainer: {
    width: CARD_WIDTH,
    aspectRatio: 63 / 88,
    borderRadius: 8,
    backgroundColor: "#050505",
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  slabPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },

  borderFrame: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    zIndex: 10,
    pointerEvents: "none",
  },
  cardImage: { width: "100%", height: "100%" },
  placeholderBg: {
    flex: 1,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },

  glassBadge: {
    position: "absolute",
    bottom: 6,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 15, 30, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    gap: 6,
    zIndex: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  glassBadgeParallel: {
    borderColor: "rgba(255, 215, 0, 0.4)",
    backgroundColor: "rgba(0, 0, 0, 0.85)",
  },
  codeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  separator: { width: 1, height: 10, backgroundColor: "rgba(255,255,255,0.3)" },
  qtyText: { color: PALETTE.gold, fontSize: 9, fontWeight: "bold" },

  altArtStarContainer: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: PALETTE.gold,
    zIndex: 15,
  },
  starText: {
    color: PALETTE.gold,
    fontSize: 9,
    fontWeight: "bold",
    marginTop: -1,
  },

  topBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 25,
  },
  topBadgeText: { color: PALETTE.cream, fontWeight: "900", fontSize: 10 },

  actionsBar: {
    position: "absolute",
    left: 6,
    right: 6,
    bottom: 34, // encima del badge code
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    zIndex: 30,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: { color: PALETTE.cream, fontWeight: "900", fontSize: 16 },
  actionCenter: { minWidth: 28, alignItems: "center" },
  actionQty: { color: PALETTE.cream, fontWeight: "900" },
});
