// ─────────────────────────────────────────────────────────
// services/cardReportService.ts
// ─────────────────────────────────────────────────────────
// Servicio para reportar cartas no encontradas en la BBDD.
// Los reportes se guardan en la tabla `card_reports` de Supabase.
// ─────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';

export const cardReportService = {
  /**
   * Reporta un código de carta que no se encontró en la BBDD.
   * Evita reportes duplicados del mismo usuario para el mismo código.
   */
  async reportMissingCard(
    cardCode: string,
    options?: {
      isAltArt?: boolean;
      source?: 'scanner' | 'manual';
    },
  ): Promise<{ success: boolean; alreadyReported?: boolean }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return { success: false };

      const code = cardCode.trim().toUpperCase();

      // Verificar si este usuario ya reportó este código
      const { data: existing } = await supabase
        .from('card_reports')
        .select('id')
        .eq('card_code', code)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        console.log(`[CardReport] Ya reportado: ${code}`);
        return { success: true, alreadyReported: true };
      }

      // Insertar reporte
      const { error } = await supabase.from('card_reports').insert({
        card_code: code,
        user_id: userId,
        is_alt_art: options?.isAltArt ?? false,
        source: options?.source ?? 'scanner',
      });

      if (error) throw error;

      console.log(`[CardReport] Reportado: ${code}`);
      return { success: true, alreadyReported: false };
    } catch (error: any) {
      console.error('[CardReport] Error:', error?.message);
      return { success: false };
    }
  },
};