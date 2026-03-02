import { supabase } from "../lib/supabase";

export const supabaseService = {
  // --- HELPER: Obtener ID del usuario logueado ---
  async getCurrentUserId(): Promise<string | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id || null;
  },

  // --- AÑADIR CARTA (BLINDADO) ---
  async addCardToCollection(
    userId: string,
    rawCode: string,
    isFoil: boolean = false,
  ) {
    try {
      const cardCode = rawCode.trim().toUpperCase();
      console.log(`🔍 Buscando carta: '${cardCode}' (Foil: ${isFoil})`);

      let cardIdToAdd = null;

      // 2. LÓGICA DE BÚSQUEDA
      if (isFoil) {
        const { data: altCard } = await supabase
          .from("cards")
          .select("id")
          .ilike("code", `${cardCode}`) // (nota: si tus alternas no tienen el mismo code exacto, habrá que cambiar esto)
          .eq("variant", "Parallel")
          .limit(1)
          .maybeSingle();

        if (altCard) {
          console.log("✨ Variante encontrada en DB, usando ID alternativo.");
          cardIdToAdd = altCard.id;
        }
      }

      if (!cardIdToAdd) {
        const { data: baseCard, error: baseError } = await supabase
          .from("cards")
          .select("id")
          .eq("code", cardCode)
          .eq("variant", "Normal")
          .maybeSingle();

        console.log(`🔍 Buscando carta base: '${baseCard}'`);
        if (baseError || !baseCard) {
          console.error("❌ Error DB buscando carta base:", baseError);
          throw new Error(
            `La carta '${cardCode}' no existe en la base de datos maestra.`,
          );
        }
        cardIdToAdd = baseCard.id;
      }

      const { data, error } = await supabase
        .from("user_collection")
        .insert({
          user_id: userId,
          card_id: cardIdToAdd,
          quantity: 1,
          is_foil: isFoil,
        })
        .select()
        .single();

      if (error) throw error;

      console.log("✅ Carta guardada con éxito:", data.id);
      return { success: true, data };
    } catch (error: any) {
      console.error("🚨 Error en addCardToCollection:", error.message);
      return { success: false, error: error.message };
    }
  },

  // --- OBTENER COLECCIÓN ---
  async getUserCollection() {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from("user_collection")
        .select(
          `
          id,
          quantity,
          scanned_at,
          is_foil,
          condition,
          card:cards (
            id,
            code,
            name,
            set_code,
            rarity,
            variant,
            image_url,
            market_price_eur,
            color
          )
        `,
        )
        .eq("user_id", userId)
        .order("scanned_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("❌ Error recuperando colección:", error);
      return [];
    }
  },

  // --- BORRAR CARTA ---
  async deleteFromCollection(collectionId: string) {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return false;

      const { error } = await supabase
        .from("user_collection")
        .delete()
        .eq("id", collectionId)
        .eq("user_id", userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error borrando:", error);
      return false;
    }
  },

  // --- ACTUALIZAR CANTIDAD ---
  async updateCardQuantity(
    collectionId: string,
    newQuantity: number,
  ): Promise<boolean> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return false;

      if (newQuantity <= 0) {
        return this.deleteFromCollection(collectionId);
      }

      const { error } = await supabase
        .from("user_collection")
        .update({ quantity: newQuantity })
        .eq("id", collectionId)
        .eq("user_id", userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error actualizando cantidad:", error);
      return false;
    }
  },

  // --- Obtener carta base por código ---
  async getBaseCardByCode(rawCode: string) {
    try {
      const cardCode = rawCode.trim().toUpperCase();

      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("code", cardCode)
        .eq("variant", "Normal")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        console.warn(`⚠️ No se encontró carta base con código: ${cardCode}`);
      }

      return data;
    } catch (error: any) {
      console.error("🚨 Error en getBaseCardByCode:", error.message);
      return null;
    }
  },

  // ==========================
  // ✅ NUEVO: count total cards
  // ==========================
  async getCardsCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("cards")
        .select("id", { count: "exact", head: true });

      if (error) throw error;
      return count ?? 0;
    } catch (e) {
      console.warn("⚠️ No se pudo obtener count de cards");
      return 0;
    }
  },

  // ==========================================
  // ✅ NUEVO: catálogo completo (paginación)
  // ==========================================
  async getCardsCatalogAll() {
    try {
      const pageSize = 1000;
      let from = 0;
      const all: any[] = [];

      while (true) {
        const to = from + pageSize - 1;

        const { data, error } = await supabase
          .from("cards")
          .select("id,code,name,set_code,color,type,variant,image_url")
          .order("code", { ascending: true })
          .range(from, to);

        if (error) throw error;

        const batch = data ?? [];
        all.push(...batch);

        if (batch.length < pageSize) break;
        from += pageSize;
      }

      return all;
    } catch (error) {
      console.error("❌ Error cargando catálogo de cartas:", error);
      return [];
    }
  },

  // ==========================
  // DECKS (BDD)
  // ==========================

  async listDecksByUser(userId: string) {
    const { data, error } = await supabase
      .from("decks")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async createDeckRow(userId: string, name: string) {
    const { data, error } = await supabase
      .from("decks")
      .insert({ user_id: userId, name })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async renameDeckRow(deckId: string, name: string) {
    const { error } = await supabase
      .from("decks")
      .update({ name })
      .eq("id", deckId);
    if (error) throw error;
  },

  async setDeckLeader(deckId: string, leaderCardId: string) {
    const { error } = await supabase
      .from("decks")
      .update({ leader_card_id: leaderCardId })
      .eq("id", deckId);

    if (error) throw error;
  },

  async deleteDeckRow(deckId: string) {
    const { error } = await supabase.from("decks").delete().eq("id", deckId);
    if (error) throw error;
  },

  async getDeckRow(deckId: string) {
    const { data, error } = await supabase
      .from("decks")
      .select("*")
      .eq("id", deckId)
      .single();

    if (error) throw error;
    return data;
  },

  async getCardByIdForDeck(cardId: string) {
    const { data, error } = await supabase
      .from("cards")
      .select("id,code,name,set_code,color,type,variant,image_url")
      .eq("id", cardId)
      .single();

    if (error) throw error;
    return data;
  },

  async getDeckCards(deckId: string) {
    const { data, error } = await supabase
      .from("deck_cards")
      .select(
        `
        id,
        deck_id,
        card_id,
        quantity,
        card:cards (
          id,code,name,set_code,color,type,variant,image_url
        )
      `,
      )
      .eq("deck_id", deckId);

    if (error) throw error;
    return data ?? [];
  },

  async upsertDeckCardQuantity(
    deckId: string,
    cardId: string,
    quantity: number,
  ) {
    const safeQty = Math.min(4, Math.max(1, Math.floor(quantity)));

    const { error } = await supabase
      .from("deck_cards")
      .upsert(
        { deck_id: deckId, card_id: cardId, quantity: safeQty },
        { onConflict: "deck_id,card_id" },
      );

    if (error) throw error;
  },

  async deleteDeckCard(deckId: string, cardId: string) {
    const { error } = await supabase
      .from("deck_cards")
      .delete()
      .eq("deck_id", deckId)
      .eq("card_id", cardId);

    if (error) throw error;
  },
};
