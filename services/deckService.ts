// services/deckService.ts
import type { CardRow, DeckDetail, DeckRow } from "../types/deck.types";
import {
  colorsSubsetOfLeader,
  isLeaderType,
  validateDeck,
} from "../utils/deckUtils";
import { supabaseService } from "./supabaseService";

export const deckRules = {
  validate: validateDeck,
};

const required = <T>(v: T | null | undefined, msg: string): T => {
  if (v === null || v === undefined) throw new Error(msg);
  return v;
};

export const deckService = {
  async getCurrentUserId(): Promise<string | null> {
    return supabaseService.getCurrentUserId();
  },

  async listDecks(): Promise<DeckRow[]> {
    const userId = await this.getCurrentUserId();
    if (!userId) return [];
    const data = await supabaseService.listDecksByUser(userId);
    return data as DeckRow[];
  },

  async createDeck(name = "Nuevo mazo"): Promise<DeckRow> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error("No autenticado");
    const deck = await supabaseService.createDeckRow(userId, name);
    return deck as DeckRow;
  },

  async renameDeck(deckId: string, name: string): Promise<void> {
    const trimmed = name.trim();
    if (trimmed.length < 3)
      throw new Error("El nombre debe tener al menos 3 caracteres.");
    await supabaseService.renameDeckRow(deckId, trimmed);
  },

  async setLeader(deckId: string, leaderCardId: string): Promise<void> {
    const leader = (await supabaseService.getCardByIdForDeck(
      leaderCardId,
    )) as CardRow;
    if (!isLeaderType(leader.type))
      throw new Error(
        "Solo puedes seleccionar una carta de tipo LEADER como líder.",
      );

    await supabaseService.setDeckLeader(deckId, leaderCardId);
  },

  async setLeaderFast(deckId: string, leaderCardId: string): Promise<void> {
    await supabaseService.setDeckLeader(deckId, leaderCardId);
  },

  async deleteDeck(deckId: string): Promise<void> {
    await supabaseService.deleteDeckRow(deckId);
  },

  async getDeck(deckId: string): Promise<DeckDetail> {
    const deck = (await supabaseService.getDeckRow(deckId)) as DeckRow;

    let leader: CardRow | null = null;
    if (deck.leader_card_id) {
      const leaderRow = await supabaseService.getCardByIdForDeck(
        deck.leader_card_id,
      );
      leader = (leaderRow ?? null) as any;
    }

    const cards = await supabaseService.getDeckCards(deckId);

    return {
      deck,
      leader,
      cards: cards as any,
    };
  },

  async getCardById(cardId: string): Promise<CardRow> {
    return (await supabaseService.getCardByIdForDeck(cardId)) as CardRow;
  },

  /**
   * Write rápido: 1 request máximo (upsert/delete).
   * La UI ya hace guardrails (50 / colores / 4 por code).
   */
  async writeDeckCardQuantity(
    deckId: string,
    cardId: string,
    quantity: number,
  ): Promise<void> {
    if (quantity <= 0) {
      await supabaseService.deleteDeckCard(deckId, cardId);
      return;
    }
    await supabaseService.upsertDeckCardQuantity(deckId, cardId, quantity);
  },

  /**
   * Método “seguro” (guardrails en service) para usos futuros.
   * NOTA: es más lento porque calcula con getDeck().
   */
  async setCardQuantity(
    deckId: string,
    cardId: string,
    quantity: number,
  ): Promise<void> {
    if (quantity <= 0) {
      await supabaseService.deleteDeckCard(deckId, cardId);
      return;
    }

    const safeQty = Math.min(4, Math.max(1, Math.floor(quantity)));

    const detail = await this.getDeck(deckId);
    const card = await this.getCardById(cardId);

    if (isLeaderType(card.type))
      throw new Error("No puedes añadir cartas LEADER al main deck.");

    if (detail.leader) {
      const ok = colorsSubsetOfLeader(detail.leader.color, card.color);
      if (!ok) {
        throw new Error(
          `Color inválido: ${card.code} (${card.color ?? "sin color"}) no es compatible con leader (${detail.leader.color ?? "sin color"}).`,
        );
      }
    }

    const pickedCode = required(
      card.code,
      "No se pudo obtener el código de la carta.",
    );
    const currentRow = detail.cards.find((dc) => dc.card_id === cardId);
    const currentQty = currentRow?.quantity ?? 0;

    const totalByCode = detail.cards.reduce((acc, dc) => {
      if ((dc.card?.code ?? "") === pickedCode) return acc + (dc.quantity ?? 0);
      return acc;
    }, 0);

    const newTotal = totalByCode - currentQty + safeQty;
    if (newTotal > 4)
      throw new Error(`Máximo 4 copias por carta (${pickedCode}).`);

    await supabaseService.upsertDeckCardQuantity(deckId, cardId, safeQty);
  },
};
