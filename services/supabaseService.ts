// ============================================
// SUPABASE SERVICE — OPSCANNER (ACTUALIZADO)
// ============================================
// CAMBIOS vs versión anterior:
// 1. Nuevo método getCardByVariant() → búsqueda inteligente por variante
// 2. addCardToCollection() ahora acepta DetectedVariant en vez de solo isFoil
// 3. Mantiene retrocompatibilidad con el flujo anterior
// ============================================

import { supabase } from '../lib/supabase';
import { DetectedVariant } from '../types/card.types';

export const supabaseService = {

  // --- HELPER: Obtener ID del usuario logueado ---
  async getCurrentUserId(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  },

  // =============================================
  // NUEVO: BUSCAR CARTA POR CÓDIGO + VARIANTE
  // =============================================
  /**
   * Busca la carta correcta en la BBDD según el código y la variante detectada.
   * Lógica de búsqueda por prioridad:
   *
   * | Variante       | Toggle AA | Query                                              |
   * |----------------|-----------|-----------------------------------------------------|
   * | null           | OFF       | code = X AND variant = 'Normal'                     |
   * | null           | ON        | code = X AND variant IN ('Parallel','Alt Art')       |
   * |                |           |   AND rarity != 'SP CARD' → primer resultado        |
   * | 'SP'           | ignorado  | code = X AND rarity = 'SP CARD'                     |
   * | 'Manga'        | ignorado  | code = X AND variant ILIKE '%manga%'                |
   * | 'Winner'       | ignorado  | Log warning + fallback a Parallel                   |
   * | 'Judge'        | ignorado  | Log warning + fallback a Parallel                   |
   * | 'Promo'        | ignorado  | code = X (formato P-XXX, búsqueda normal)           |
   *
   * @param cardCode - Código limpio de la carta (ej: 'OP05-060', 'P-001')
   * @param detectedVariant - Variante detectada por OCR/imagen (o null)
   * @param isAltMode - Estado del toggle AA (solo aplica si variant es null)
   * @returns ID de la carta en la BBDD o null
   */
  async getCardByVariant(
    cardCode: string,
    detectedVariant: DetectedVariant,
    isAltMode: boolean = false
  ): Promise<{ cardId: string; variant: string; rarity: string } | null> {
    try {
      const code = cardCode.trim().toUpperCase();

      // --- SP: Buscar por rarity = 'SP CARD' ---
      if (detectedVariant === 'SP') {
        console.log(`🔍 Buscando SP: code=${code}, rarity='SP CARD'`);
        const { data, error } = await supabase
          .from('cards')
          .select('id, variant, rarity')
          .eq('code', code)
          .eq('rarity', 'SP CARD')
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          console.log(`✨ SP encontrada: ${data.id}`);
          return { cardId: data.id, variant: data.variant, rarity: data.rarity };
        }

        // Fallback: si no encontramos SP específica, buscar cualquier Parallel
        console.warn(`⚠️ SP no encontrada para ${code}, buscando Parallel como fallback`);
        return this._findParallel(code);
      }

      // --- MANGA: Buscar por variant que contenga 'manga' ---
      if (detectedVariant === 'Manga') {
        console.log(`🔍 Buscando Manga: code=${code}`);
        const { data, error } = await supabase
          .from('cards')
          .select('id, variant, rarity')
          .eq('code', code)
          .ilike('variant', '%manga%')
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          console.log(`✨ Manga encontrada: ${data.id}`);
          return { cardId: data.id, variant: data.variant, rarity: data.rarity };
        }

        // Fallback: intentar con 'Manga / Special (V3)' exacto
        const { data: v3Data } = await supabase
          .from('cards')
          .select('id, variant, rarity')
          .eq('code', code)
          .eq('variant', 'Manga / Special (V3)')
          .limit(1)
          .maybeSingle();

        if (v3Data) {
          console.log(`✨ Manga (V3) encontrada: ${v3Data.id}`);
          return { cardId: v3Data.id, variant: v3Data.variant, rarity: v3Data.rarity };
        }

        console.warn(`⚠️ Manga no encontrada para ${code}, buscando Parallel como fallback`);
        return this._findParallel(code);
      }

      // --- WINNER / JUDGE: No están en BBDD aún, fallback a Parallel ---
      if (detectedVariant === 'Winner' || detectedVariant === 'Judge') {
        console.log(`🔍 ${detectedVariant} detectado para ${code} — buscando Parallel como fallback`);
        console.warn(
          `⚠️ Las cartas ${detectedVariant} no tienen variante específica en la BBDD todavía. ` +
          `Se guardará como Parallel.`
        );
        return this._findParallel(code);
      }

      // --- PROMO: Buscar con el código P-XXX directamente ---
      if (detectedVariant === 'Promo') {
        console.log(`🔍 Buscando Promo: code=${code}`);
        const { data, error } = await supabase
          .from('cards')
          .select('id, variant, rarity')
          .eq('code', code)
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          console.log(`✨ Promo encontrada: ${data.id}`);
          return { cardId: data.id, variant: data.variant, rarity: data.rarity };
        }
        return null;
      }

      // --- SIN VARIANTE DETECTADA: usar toggle AA ---
      if (isAltMode) {
        // AA activado → buscar Parallel (excluyendo SP CARD)
        console.log(`🔍 Buscando Parallel (AA mode): code=${code}`);
        return this._findParallel(code);
      }

      // Normal mode → buscar carta base
      console.log(`🔍 Buscando Normal: code=${code}`);
      const { data, error } = await supabase
        .from('cards')
        .select('id, variant, rarity')
        .eq('code', code)
        .eq('variant', 'Normal')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        return { cardId: data.id, variant: data.variant, rarity: data.rarity };
      }

      return null;

    } catch (error: any) {
      console.error('🚨 Error en getCardByVariant:', error.message);
      return null;
    }
  },

  // --- Helper: Buscar primera variante Parallel (excluyendo SP CARD) ---
  async _findParallel(code: string): Promise<{ cardId: string; variant: string; rarity: string } | null> {
    const { data, error } = await supabase
      .from('cards')
      .select('id, variant, rarity')
      .eq('code', code)
      .in('variant', ['Parallel', 'Alt Art', 'Parallel (V2)'])
      .neq('rarity', 'SP CARD')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('🚨 Error buscando Parallel:', error.message);
      return null;
    }

    if (data) {
      return { cardId: data.id, variant: data.variant, rarity: data.rarity };
    }

    return null;
  },

  // =============================================
  // AÑADIR CARTA (ACTUALIZADO)
  // =============================================
  /**
   * Añade una carta a la colección del usuario.
   * Ahora acepta la variante detectada para búsqueda inteligente.
   *
   * @param userId - ID del usuario
   * @param rawCode - Código de la carta (ej: 'OP05-060')
   * @param detectedVariant - Variante detectada automáticamente
   * @param isAltMode - Toggle AA activo (fallback si no hay variante detectada)
   */
  async addCardToCollection(
    userId: string,
    rawCode: string,
    detectedVariant: DetectedVariant = null,
    isAltMode: boolean = false
  ) {
    try {
      const cardCode = rawCode.trim().toUpperCase();

      console.log(
        `🔍 addCard: code=${cardCode}, variant=${detectedVariant || 'none'}, AA=${isAltMode}`
      );

      // 1. BUSCAR LA CARTA CORRECTA
      const result = await this.getCardByVariant(cardCode, detectedVariant, isAltMode);

      if (!result) {
        throw new Error(
          `La carta '${cardCode}' (variante: ${detectedVariant || 'Normal'}) no existe en la base de datos.`
        );
      }

      // 2. DETERMINAR is_foil
      // Es foil si: tiene variante detectada (SP, Manga, Winner, Judge)
      // O si el toggle AA está activo y no se detectó variante
      const isFoil = detectedVariant !== null || isAltMode;

      // 3. INSERTAR EN LA COLECCIÓN
      const { data, error } = await supabase
        .from('user_collection')
        .insert({
          user_id: userId,
          card_id: result.cardId,
          quantity: 1,
          is_foil: isFoil,
        })
        .select()
        .single();

      if (error) throw error;

      console.log(
        `✅ Carta guardada: ${cardCode} → variant=${result.variant}, rarity=${result.rarity}`
      );

      return {
        success: true,
        data,
        matchedVariant: result.variant,
        matchedRarity: result.rarity,
      };

    } catch (error: any) {
      console.error('🚨 Error en addCardToCollection:', error.message);
      return { success: false, error: error.message };
    }
  },

  // =============================================
  // MÉTODOS EXISTENTES (SIN CAMBIOS)
  // =============================================

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
  },

  // =============================================
  // NUEVO: Verificar si existe variante Manga en BBDD
  // =============================================
  /**
   * Comprueba si un código tiene variante Manga en la BBDD.
   * Se usa como confirmación del análisis de imagen.
   *
   * @param code - Código de la carta
   * @returns true si existe una variante manga
   */
  async hasMangaVariant(code: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('id')
        .eq('code', code.trim().toUpperCase())
        .or('variant.ilike.%manga%,variant.eq.Manga / Special (V3)')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error verificando manga:', error);
      return false;
    }
  },
};