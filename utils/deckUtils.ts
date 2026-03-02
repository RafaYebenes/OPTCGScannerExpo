// utils/deckUtils.ts
import type { DeckDetail, DeckValidationResult } from "../types/deck.types";

export const normalizeColors = (raw: string | null | undefined): string[] => {
  if (!raw) return [];
  return raw
    .split(/[\/,]/g)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
};

export const isLeaderType = (t: string | null | undefined) =>
  (t ?? "").toUpperCase() === "LEADER";

export const colorsSubsetOfLeader = (
  leaderColor: string | null | undefined,
  cardColor: string | null | undefined,
) => {
  const leader = new Set(normalizeColors(leaderColor));
  const card = normalizeColors(cardColor);
  if (leader.size === 0 || card.length === 0) return true;
  return card.every((c) => leader.has(c));
};

export const buildCountsByCode = (detail: DeckDetail) => {
  const map = new Map<string, number>();
  for (const dc of detail.cards) {
    const code = dc.card?.code;
    if (!code) continue;
    map.set(code, (map.get(code) ?? 0) + dc.quantity);
  }
  return map;
};

export const getMainCount = (detail: DeckDetail) =>
  detail.cards.reduce((acc, dc) => acc + (dc.quantity || 0), 0);

export const validateDeck = (detail: DeckDetail): DeckValidationResult => {
  const errors: string[] = [];

  // 1) Leader obligatorio
  if (!detail.leader) {
    errors.push("Falta el Leader.");
  } else if (!isLeaderType(detail.leader.type)) {
    errors.push(
      `El Leader seleccionado no es de tipo LEADER (${detail.leader.code}).`,
    );
  }

  // 2) Conteos exactos
  const mainCount = getMainCount(detail);
  const total = (detail.leader ? 1 : 0) + mainCount;

  if (mainCount !== 50)
    errors.push(
      `El main deck debe tener 50 cartas exactas. Ahora: ${mainCount}.`,
    );
  if (total !== 51)
    errors.push(
      `El mazo debe tener 51 cartas exactas (Leader + 50). Ahora: ${total}.`,
    );

  // 3) Prohibido LEADER en el main deck
  for (const dc of detail.cards) {
    if (isLeaderType(dc.card?.type ?? null)) {
      errors.push(
        `Carta inválida en el main deck: ${dc.card?.code} es LEADER.`,
      );
    }
  }

  // 4) Máximo 4 por CODE (Normal+Parallel suman)
  const byCode = buildCountsByCode(detail);
  for (const [code, qty] of byCode.entries()) {
    if (qty > 4) errors.push(`La carta ${code} supera 4 copias (${qty}).`);
  }

  // 5) Colores compatibles
  if (detail.leader) {
    for (const dc of detail.cards) {
      const card = dc.card;
      if (!card) continue;
      const ok = colorsSubsetOfLeader(detail.leader.color, card.color);
      if (!ok) {
        errors.push(
          `Color inválido: ${card.code} (${card.color ?? "sin color"}) no es compatible con leader (${detail.leader.color ?? "sin color"}).`,
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, stats: { mainCount, total } };
};
