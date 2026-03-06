import { supabase } from '../lib/supabase';

export const supabaseService = {

  // --- HELPER: Obtener ID del usuario logueado ---
  async getCurrentUserId(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  },

  // --- AÑADIR CARTA (BLINDADO) ---
  async addCardToCollection(userId: string, rawCode: string, isFoil: boolean = false) {
    try {
      // 1. LIMPIEZA: Quitamos espacios y forzamos mayúsculas
      const cardCode = rawCode.trim().toUpperCase();
      
      console.log(`🔍 Buscando carta: '${cardCode}' (Foil: ${isFoil})`);

      let cardIdToAdd = null;

      // 2. LÓGICA DE BÚSQUEDA
      if (isFoil) {
        const { data: altCard } = await supabase
          .from('cards')
          .select('id')
          .ilike('code', `${cardCode}`)
          .eq('variant', 'Parallel')
          .limit(1)
          .maybeSingle();
        
        if (altCard) {
            console.log("✨ Variante encontrada en DB, usando ID alternativo.");
            cardIdToAdd = altCard.id;
        }
      }

      if (!cardIdToAdd) {
        const { data: baseCard, error: baseError } = await supabase
            .from('cards')
            .select('id')
            .eq('code', cardCode)
            .eq('variant', 'Normal')
            .maybeSingle();

          console.log(`🔍 Buscando carta base: '${baseCard}'`);
        if (baseError || !baseCard) {
            console.error("❌ Error DB buscando carta base:", baseError);
            throw new Error(`La carta '${cardCode}' no existe en la base de datos maestra.`);
        }
        cardIdToAdd = baseCard.id;
      }

      // 3. COMPROBAR SI YA EXISTE EN LA COLECCIÓN → UPSERT
      const { data: existing } = await supabase
        .from('user_collection')
        .select('id, quantity')
        .eq('user_id', userId)
        .eq('card_id', cardIdToAdd)
        .eq('is_foil', isFoil)
        .maybeSingle();

      if (existing) {
        // Ya la tiene → incrementar quantity
        const newQty = (existing.quantity || 1) + 1;
        const { error: updateError } = await supabase
          .from('user_collection')
          .update({ quantity: newQty })
          .eq('id', existing.id);

        if (updateError) throw updateError;

        console.log(`✅ Carta actualizada (qty: ${newQty}):`, existing.id);
        return { success: true, data: { ...existing, quantity: newQty } };
      }

      // No existe → insertar nueva fila
      const { data, error } = await supabase
        .from('user_collection') 
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
      console.error('🚨 Error en addCardToCollection:', error.message);
      return { success: false, error: error.message };
    }
  },

  // --- OBTENER COLECCIÓN ---
  async getUserCollection() {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_collection')
        .select(`
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
        `)
        .eq('user_id', userId)
        .order('scanned_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error recuperando colección:', error);
      return [];
    }
  },

  // --- BORRAR CARTA ---
  async deleteFromCollection(collectionId: string) {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return false;

      const { error } = await supabase
        .from('user_collection')
        .delete()
        .eq('id', collectionId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error borrando:', error);
      return false;
    }
  },

  // --- ACTUALIZAR CANTIDAD ---
  async updateCardQuantity(collectionId: string, newQuantity: number): Promise<boolean> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return false;

      if (newQuantity <= 0) {
        return this.deleteFromCollection(collectionId);
      }

      const { error } = await supabase
        .from('user_collection')
        .update({ quantity: newQuantity })
        .eq('id', collectionId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error actualizando cantidad:', error);
      return false;
    }
  },

  // --- Obtener carta base por código ---
  async getBaseCardByCode(rawCode: string) {
    try {
      const cardCode = rawCode.trim().toUpperCase();
      
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('code', cardCode)
        .eq('variant', 'Normal')
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        console.warn(`⚠️ No se encontró carta base con código: ${cardCode}`);
      }

      return data;
    } catch (error: any) {
      console.error('🚨 Error en getBaseCardByCode:', error.message);
      return null;
    }
  }
};