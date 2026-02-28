// services/deckService.ts
import { supabase } from "../lib/supabase";

// --------------------
// Types
// --------------------

export type DeckRow = {
  id: string;
  user_id: string;
  name: string;
  leader_card_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CardRow = {
  id: string;
  code: string;
  name: string;
  color: string | null;
  type: "LEADER" | "CHARACTER" | "EVENT" | string | null;
  variant: "Normal" | "Parallel" | string | null;
  image_url?: string | null;
};

export type DeckCardRow = {
  id: string;
  deck_id: string;
  card_id: string;
  quantity: number;
  card?: CardRow;
};

export type DeckDetail = {
  deck: DeckRow;
  leader: CardRow | null;
  cards: DeckCardRow[]; // main deck (sin leader)
};

// --------------------
// Helpers
// --------------------

const normalizeColors = (raw: string | null | undefined): string[] => {
  if (!raw) return [];
  return raw
    .split(/[\/,]/g)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
};

const isLeaderType = (t: string | null | undefined) =>
  (t ?? "").toUpperCase() === "LEADER";

const colorsSubsetOfLeader = (
  leaderColor: string | null | undefined,
  cardColor: string | null | undefined,
) => {
  const leader = new Set(normalizeColors(leaderColor));
  const card = normalizeColors(cardColor);
  if (leader.size === 0 || card.length === 0) return true; // no podemos validar si falta color
  return card.every((c) => leader.has(c));
};

const required = <T>(v: T | null | undefined, msg: string): T => {
  if (v === null || v === undefined) throw new Error(msg);
  return v;
};

// --------------------
// Rules (validación completa)
// --------------------

export const deckRules = {
  validate(detail: DeckDetail) {
    const errors: string[] = [];

    // 1) Leader obligatorio
    if (!detail.leader) {
      errors.push("Falta el Leader.");
    } else {
      if (!isLeaderType(detail.leader.type)) {
        errors.push(
          `El Leader seleccionado no es de tipo LEADER (${detail.leader.code}).`,
        );
      }
    }

    // 2) Conteos exactos
    const mainCount = detail.cards.reduce(
      (acc, dc) => acc + (dc.quantity || 0),
      0,
    );
    const total = (detail.leader ? 1 : 0) + mainCount;

    if (mainCount !== 50)
      errors.push(
        `El main deck debe tener 50 cartas exactas. Ahora: ${mainCount}.`,
      );
    if (total !== 51)
      errors.push(
        `El mazo debe tener 51 cartas exactas (Leader + 50). Ahora: ${total}.`,
      );

    // 3) Prohibido LEADER dentro del main deck
    for (const dc of detail.cards) {
      if (isLeaderType(dc.card?.type ?? null)) {
        errors.push(
          `Carta inválida en el main deck: ${dc.card?.code} es LEADER.`,
        );
      }
    }

    // 4) Máximo 4 copias por CODE (Normal + Parallel suman)
    const byCode = new Map<string, number>();
    for (const dc of detail.cards) {
      const code = dc.card?.code;
      if (!code) continue;
      byCode.set(code, (byCode.get(code) ?? 0) + dc.quantity);
    }

    for (const [code, qty] of byCode.entries()) {
      if (qty > 4) errors.push(`La carta ${code} supera 4 copias (${qty}).`);
    }

    // 5) Colores compatibles con Leader
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

    return {
      ok: errors.length === 0,
      errors,
      stats: { mainCount, total },
    };
  },
};

// --------------------
// Service (CRUD + guardrails)
// --------------------

export const deckService = {
  async getCurrentUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  },

  // -------- Decks --------

  async listDecks(): Promise<DeckRow[]> {
    const { data, error } = await supabase
      .from("decks")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as DeckRow[];
  },

  async createDeck(name = "Nuevo mazo"): Promise<DeckRow> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error("No autenticado");

    const { data, error } = await supabase
      .from("decks")
      .insert({ user_id: userId, name })
      .select("*")
      .single();

    if (error) throw error;
    return data as DeckRow;
  },

  async renameDeck(deckId: string, name: string): Promise<void> {
    const trimmed = name.trim();
    if (trimmed.length < 3)
      throw new Error("El nombre debe tener al menos 3 caracteres.");

    const { error } = await supabase
      .from("decks")
      .update({ name: trimmed })
      .eq("id", deckId);
    if (error) throw error;
  },

  async setLeader(deckId: string, leaderCardId: string): Promise<void> {
    // Guard: debe ser tipo LEADER
    const leader = await this.getCardById(leaderCardId);
    if (!isLeaderType(leader.type))
      throw new Error(
        "Solo puedes seleccionar una carta de tipo LEADER como líder.",
      );

    const { error } = await supabase
      .from("decks")
      .update({ leader_card_id: leaderCardId })
      .eq("id", deckId);
    if (error) throw error;
  },

  async deleteDeck(deckId: string): Promise<void> {
    const { error } = await supabase.from("decks").delete().eq("id", deckId);
    if (error) throw error;
  },

  // -------- Read deck full --------

  async getDeck(deckId: string): Promise<DeckDetail> {
    const { data: deck, error: deckErr } = await supabase
      .from("decks")
      .select("*")
      .eq("id", deckId)
      .single();
    if (deckErr) throw deckErr;

    let leader: CardRow | null = null;
    if (deck.leader_card_id) {
      const { data: leaderRow, error: leaderErr } = await supabase
        .from("cards")
        .select("id,code,name,color,type,variant,image_url")
        .eq("id", deck.leader_card_id)
        .maybeSingle();

      if (leaderErr) throw leaderErr;
      leader = (leaderRow ?? null) as any;
    }

    const { data: cards, error: cardsErr } = await supabase
      .from("deck_cards")
      .select(
        `
        id,
        deck_id,
        card_id,
        quantity,
        card:cards (
          id,code,name,color,type,variant,image_url
        )
      `,
      )
      .eq("deck_id", deckId);

    if (cardsErr) throw cardsErr;

    return {
      deck: deck as DeckRow,
      leader,
      cards: (cards ?? []) as DeckCardRow[],
    };
  },

  // -------- Deck cards --------

  /**
   * Setea quantity (1..4). Si quantity <= 0 borra la fila.
   * Guardrails:
   * - Prohíbe LEADER en main deck
   * - Si hay leader, prohíbe cartas fuera de sus colores
   * - Prohíbe superar 4 copias por CODE (Normal+Parallel)
   */
  async setCardQuantity(
    deckId: string,
    cardId: string,
    quantity: number,
  ): Promise<void> {
    if (quantity <= 0) {
      const { error } = await supabase
        .from("deck_cards")
        .delete()
        .eq("deck_id", deckId)
        .eq("card_id", cardId);
      if (error) throw error;
      return;
    }

    const safeQty = Math.min(4, Math.max(1, Math.floor(quantity)));

    // Cargar deck (leader + main) para checks consistentes
    const detail = await this.getDeck(deckId);

    // Guard: no LEADER en main
    const card = await this.getCardById(cardId);
    if (isLeaderType(card.type))
      throw new Error("No puedes añadir cartas LEADER al main deck.");

    // Guard: colores (si hay leader)
    if (detail.leader) {
      const ok = colorsSubsetOfLeader(detail.leader.color, card.color);
      if (!ok) {
        throw new Error(
          `Color inválido: ${card.code} (${card.color ?? "sin color"}) no es compatible con leader (${detail.leader.color ?? "sin color"}).`,
        );
      }
    }

    // Guard: max 4 por CODE sumando filas (Normal+Parallel)
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

    // totalByCode incluye currentQty; ajustamos al nuevo valor
    const newTotal = totalByCode - currentQty + safeQty;
    if (newTotal > 4)
      throw new Error(
        `Máximo 4 copias por carta (${pickedCode}). Ahora intentarías ${newTotal}.`,
      );

    // Upsert (manual: select existing -> insert/update)
    const { data: existing, error: exErr } = await supabase
      .from("deck_cards")
      .select("id,quantity")
      .eq("deck_id", deckId)
      .eq("card_id", cardId)
      .maybeSingle();

    if (exErr) throw exErr;

    if (!existing) {
      const { error } = await supabase
        .from("deck_cards")
        .insert({ deck_id: deckId, card_id: cardId, quantity: safeQty });
      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from("deck_cards")
      .update({ quantity: safeQty })
      .eq("id", existing.id);
    if (error) throw error;
  },

  // --------------------
  // Internal card helper
  // --------------------

  async getCardById(cardId: string): Promise<CardRow> {
    const { data, error } = await supabase
      .from("cards")
      .select("id,code,name,color,type,variant,image_url")
      .eq("id", cardId)
      .single();

    if (error) throw error;
    return data as CardRow;
  },

  async setLeaderFast(deckId: string, leaderCardId: string): Promise<void> {
    // Sin validaciones extra: la UI ya filtra a LEADER.
    const { error } = await supabase
      .from("decks")
      .update({ leader_card_id: leaderCardId })
      .eq("id", deckId);

    if (error) throw error;
  },

  async writeDeckCardQuantity(
    deckId: string,
    cardId: string,
    quantity: number,
  ): Promise<void> {
    // 1 request máximo
    if (quantity <= 0) {
      const { error } = await supabase
        .from("deck_cards")
        .delete()
        .eq("deck_id", deckId)
        .eq("card_id", cardId);

      if (error) throw error;
      return;
    }

    const safeQty = Math.min(4, Math.max(1, Math.floor(quantity)));

    const { error } = await supabase
      .from("deck_cards")
      .upsert(
        { deck_id: deckId, card_id: cardId, quantity: safeQty },
        { onConflict: "deck_id,card_id" },
      );

    if (error) throw error;
  },
};
