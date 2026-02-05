// src/services/supabaseService.ts
import { supabase } from '../lib/supabase';

// ID Ficticio para desarrollo (Simulamos ser este usuario siempre)
const SIMULATED_USER_ID = 'f98c0e75-a7d9-4fab-ac5c-67ddd2ce1a54';

export const supabaseService = {

    // 1. Asegurar que el usuario de prueba existe
    async ensureTestUser() {
        const { data: user } = await supabase.from('profiles').select('id').eq('id', SIMULATED_USER_ID).single();

        if (!user) {
            console.log('Creando usuario de prueba...');
            // Necesitamos crear primero el auth user "falso" o insertar directamente en profiles si RLS lo permite.
            // TRUCO DEV: Insertamos directamente en profiles asumiendo que desactivaste RLS o permites insert público temporalmente
            // Si esto falla, tendrás que crear un usuario real en Auth de Supabase y usar su ID.
            const { error } = await supabase.from('profiles').insert({
                id: SIMULATED_USER_ID,
                username: 'Tester Dev',
                subscription_tier: 'pro'
            });
            if (error) console.error('Error creando user test:', error);
        }
    },

    // 2. Guardar carta escaneada
    async addCardToCollection(codeString: string, isAltArt: boolean = false): Promise<boolean> {
        console.log(`\n🔵 [START] Intentando guardar carta: ${codeString}`);

        try {
            // 1. Verificar usuario
            console.log(`👤 [STEP 1] Usando ID Usuario: ${SIMULATED_USER_ID}`);

            const variant = isAltArt ? 'Parallel' : 'Normal';

            // 2. Buscar carta
            console.log(`🔍 [STEP 2] Buscando en catálogo master...`);
            let { data: card, error: searchError } = await supabase
                .from('cards')
                .select('id')
                .eq('code', codeString)
                .eq('variant', variant)
                .single();

            if (searchError && searchError.code !== 'PGRST116') { // PGRST116 es "no results", ese no es error grave
                console.error(`❌ [ERROR BUSQUEDA]`, JSON.stringify(searchError, null, 2));
            }

            // 3. Crear si no existe
            if (!card) {
                console.log(`✨ [INFO] Carta no existe. Creando nueva entrada en catálogo...`);
                const { data: newCard, error: createError } = await supabase
                    .from('cards')
                    .insert({
                        code: codeString,
                        name: `Card ${codeString}`,
                        set_code: codeString.split('-')[0] || 'UNKNOWN',
                        variant: variant,
                        rarity: 'Unknown',
                        type: 'Character'
                    })
                    .select('id')
                    .single();

                if (createError) {
                    console.error(`❌ [ERROR CREACIÓN] No se pudo crear la carta master:`, JSON.stringify(createError, null, 2));
                    throw createError;
                }
                card = newCard;
                console.log(`✅ [INFO] Carta master creada con ID: ${card.id}`);
            }

            // 4. Insertar en colección
            console.log(`💾 [STEP 3] Insertando en user_collection...`);
            const { data: insertData, error: insertError } = await supabase
                .from('user_collection')
                .insert({
                    user_id: SIMULATED_USER_ID,
                    card_id: card.id,
                    quantity: 1,
                    is_foil: isAltArt,
                    scanned_at: new Date().toISOString(),
                })
                .select();

            if (insertError) {
                console.error(`❌ [ERROR INSERT] Falló al guardar en colección:`, JSON.stringify(insertError, null, 2));
                throw insertError; // Lanzamos para que lo pille el catch de abajo
            }

            console.log(`✅ [SUCCESS] ¡Carta guardada correctamente!`, insertData);
            return true;

        } catch (error) {
            // Este catch pilla errores de red (sin internet) o excepciones lanzadas arriba
            console.error(`💀 [FATAL ERROR] Excepción no controlada:`, error);

            // TRUCO: Muestra una alerta visual en el móvil por si no estás mirando la consola
            // import { Alert } from 'react-native';
            // Alert.alert("Error de Base de Datos", JSON.stringify(error));

            return false;
        }
    },

    // 3. Obtener últimas escaneadas (para el UI)
    async getRecentScans(limit = 10) {
        const { data, error } = await supabase
            .from('user_collection')
            .select(`
        id,
        scanned_at,
        card:cards (
          code,
          name,
          set_code,
          variant,
          image_url
        )
      `)
            .eq('user_id', SIMULATED_USER_ID)
            .order('scanned_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error(error);
            return [];
        }

        // Mapeamos al formato que espera tu UI (ScannedCard)
        return data.map((item: any) => ({
            id: item.id,
            code: {
                fullCode: item.card.code,
                set: item.card.set_code,
                number: item.card.code.split('-')[1] || '000'
            },
            hasAlternateArt: item.card.variant !== 'Normal',
            scannedAt: new Date(item.scanned_at).getTime(),
            confidence: 100
        }));
    }
};