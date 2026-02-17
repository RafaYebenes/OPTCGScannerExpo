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
      // Esto soluciona el 99% de errores de "Carta no encontrada"
      const cardCode = rawCode.trim().toUpperCase();
      
      console.log(`🔍 Buscando carta: '${cardCode}' (Foil: ${isFoil})`);

      let cardIdToAdd = null;

      // 2. LÓGICA DE BÚSQUEDA
      if (isFoil) {
        // A. Si es Foil/AA, intentamos ser listos y buscar si existe una variante '_p1' en la BBDD
        // Esto es para que se guarde con la IMAGEN de la Alt Art si es posible.
        const { data: altCard } = await supabase
          .from('cards')
          .select('id')
          .ilike('code', `${cardCode}`) // Busca OP01-001_p1, _p2...
          .eq('variant', 'Parallel') // Solo nos interesan variantes Foil
          .limit(1)
          .maybeSingle();
        
        if (altCard) {
            console.log("✨ Variante encontrada en DB, usando ID alternativo.");
            cardIdToAdd = altCard.id;
        }
      }

      // B. Si no encontramos variante (o no es foil), buscamos la carta base exacta
      if (!cardIdToAdd) {
        const { data: baseCard, error: baseError } = await supabase
            .from('cards')
            .select('id')
            .eq('code', cardCode)
            .eq('variant', 'Normal') // Aseguramos coger la versión normal para no duplicar variantes
            .maybeSingle(); // Usamos maybeSingle para no lanzar error todavía

          console.log(`🔍 Buscando carta base: '${baseCard}'`);
        if (baseError || !baseCard) {
            console.error("❌ Error DB buscando carta base:", baseError);
            throw new Error(`La carta '${cardCode}' no existe en la base de datos maestra.`);
        }
        cardIdToAdd = baseCard.id;
      }

      // 3. INSERTAR EN LA COLECCIÓN DEL USUARIO
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
            market_price_eur
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
  }
};