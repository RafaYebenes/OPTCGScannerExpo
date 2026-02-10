// src/services/supabaseService.ts
import { supabase } from '../lib/supabase';

export const supabaseService = {

  // --- HELPER: Obtener ID del usuario logueado ---
  async getCurrentUserId(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  },

  // --- AÑADIR CARTA (Con Validación Estricta) ---
  async addCardToCollection(codeString: string, isAltArt: boolean = false): Promise<boolean> {
    console.log(`\n🔵 [INTENTO] Guardando: ${codeString} | Alt: ${isAltArt}`);

    try {
      // 1. Obtener Usuario Real
      const userId = await this.getCurrentUserId();
      if (!userId) {
        console.error('❌ Error: No hay usuario logueado.');
        return false;
      }

      // 2. Determinar la variante a buscar
      // Asumimos que tu BBDD tiene 'Normal' y 'Parallel' (o el nombre que usaras en tus scripts de carga)
      const targetVariant = isAltArt ? 'Parallel' : 'Normal';

      // 3. COMPROBACIÓN MAESTRA (La parte nueva)
      // Buscamos si la carta existe en la base de datos oficial ('cards')
      let query = supabase
        .from('cards')
        .select('id, name, rarity')
        .eq('code', codeString);

      // Si es Alt Art, intentamos buscar específicamente la versión paralela.
      // Si es Normal, buscamos la normal.
      // NOTA: Si en tu BBDD las Alt Arts se llaman "Alternate Art" o "Manga", ajusta el string aquí.
      // Si quieres ser menos estricto con las Alt Arts, podrías quitar el filtro de variante
      // si no encuentras la específica, pero por ahora seremos estrictos.
      query = query.eq('variant', targetVariant);

      const { data: cardsFound, error: searchError } = await query;

      if (searchError) throw searchError;

      // 4. VALIDACIÓN: ¿Existe la carta?
      if (!cardsFound || cardsFound.length === 0) {
        console.warn(`⚠️ Carta rechazada: ${codeString} (${targetVariant}) no existe en la base de datos maestra.`);
        // Aquí podrías lanzar un Toast/Alert al usuario diciendo "Carta no reconocida"
        return false;
      }

      // Tomamos la primera coincidencia (por si hubiera duplicados, que no debería)
      const validCard = cardsFound[0];
      console.log(`✅ Carta validada: ${validCard.name} (ID: ${validCard.id})`);

      // 5. INSERTAR EN COLECCIÓN DEL USUARIO
      // Usamos 'upsert' por si ya la tiene, para no duplicar filas si no quieres,
      // o 'insert' si quieres permitir tener 5 filas de la misma carta.
      // Para coleccionismo, lo normal es tener 1 fila con quantity = X, o varias filas únicas.
      // Aquí haremos INSERT simple como tenías, asumiendo que quieres registrar cada escaneo.

      /* OPCIONAL: Si quieres sumar cantidad en vez de crear fila nueva:
         Hacía falta comprobar si ya existe en user_collection y hacer update.
         Por ahora mantenemos tu lógica de INSERT nueva entrada.
      */

      const { error: insertError } = await supabase
        .from('user_collection')
        .insert({
          user_id: userId,            // <--- ID REAL
          card_id: validCard.id,
          quantity: 1,
          is_foil: isAltArt,
          condition: 'Near Mint',
          scanned_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      console.log(`🎉 Guardado exitoso en la colección de ${userId}`);
      return true;

    } catch (error) {
      console.error('❌ Error crítico en addCardToCollection:', error);
      return false;
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
        .eq('user_id', userId) // Solo mis cartas
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
        .eq('user_id', userId); // Seguridad: solo borro si es mía

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error borrando:', error);
      return false;
    }
  },

  async updateCardQuantity(collectionId: string, newQuantity: number): Promise<boolean> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return false;

      // Si la cantidad es 0 o menos, borramos la carta
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