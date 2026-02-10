require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://umeajfuaweobyjeuopii.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2pDeJby3VymlDm8_5MEOAg_TdTd1DnC';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
// --- GENERADOR DE URL ---
const generateUrlFromPythonLogic = (card) => {
  const BASE_IMG_URL = "https://en.onepiece-cardgame.com/images/cardlist/card/";
  const code = card.id_normal; 
  let suffix = "";
  
  if (card.name) {
    if (card.name.includes('(V.2)')) suffix = "_p1";
    else if (card.name.includes('(V.3)')) suffix = "_p2";
  }
  if (!suffix && card.id !== card.id_normal) {
     if (card.id.endsWith('_p1')) suffix = "_p1";
     if (card.id.endsWith('_p2')) suffix = "_p2";
  }

  return `${BASE_IMG_URL}${code}${suffix}.png`;
};

async function importCards() {
  console.log('📂 Leyendo cards.json...');
  
  try {
    const rawData = fs.readFileSync('cards.json', 'utf8');
    const cards = JSON.parse(rawData);
    
    // Solo cartas en inglés
    const englishCards = cards.filter(c => c.language === 'en');
    console.log(`🇬🇧 Cartas en bruto encontradas: ${englishCards.length}`);

    // --- PASO 1: PROCESAR Y DESDUPLICAR EN MEMORIA ---
    // Usamos un Map donde la CLAVE será "CODE|VARIANT".
    // Esto elimina automáticamente cualquier duplicado antes de tocar la base de datos.
    const uniqueCardsMap = new Map();

    englishCards.forEach(c => {
        // Lógica de Variante
        let variant = 'Normal';
        if (c.id !== c.id_normal || (c.name && c.name.includes('(V.'))) {
            if (c.name.includes('(V.2)')) variant = 'Parallel (V2)';
            else if (c.name.includes('(V.3)')) variant = 'Manga / Special (V3)';
            else variant = 'Parallel';
        }

        const priceEur = parseFloat(c.cmPrice) || 0;

        // Objeto fila listo para Supabase
        const row = {
          code: c.id_normal,
          set_code: c.set,
          variant: variant,
          name: c.name,
          image_url: generateUrlFromPythonLogic(c),
          rarity: c.rarity,
          market_price_eur: priceEur,
          color: c.Color,
          type: c.cardType,       
          cost: c.Cost,           
          power: c.Power,         
          counter: c.Counter,     
          attribute: c.Attribute, 
          effect: c.Effect,       
          feature: c.Type         
        };

        // CREAMOS LA CLAVE ÚNICA PARA EL MAPA
        const uniqueKey = `${row.code}|${row.variant}`;
        
        // Si ya existe, lo sobrescribe (o lo ignora, da igual porque son idénticos)
        uniqueCardsMap.set(uniqueKey, row);
    });

    // Convertimos el mapa de vuelta a un array limpio
    const cleanRows = Array.from(uniqueCardsMap.values());
    console.log(`✨ Cartas únicas reales tras limpiar duplicados: ${cleanRows.length}`);

    // --- PASO 2: ENVIAR A SUPABASE POR LOTES ---
    const batchSize = 100;
    let processed = 0;

    for (let i = 0; i < cleanRows.length; i += batchSize) {
      const batch = cleanRows.slice(i, i + batchSize);
      
      // Upsert a Supabase
      const { error } = await supabase
        .from('cards')
        .upsert(batch, { 
          onConflict: 'code, variant',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('❌ Error en lote:', error.message);
        // Si falla un lote, intentamos ver cuál es la fila problemática (debugging)
        // console.log(JSON.stringify(batch, null, 2));
      } else {
        processed += batch.length;
        console.log(`✅ Procesadas: ${processed} / ${cleanRows.length}`);
      }
    }

    console.log('🏁 Base de datos actualizada con ÉXITO.');

  } catch (err) {
    console.error('🔥 Error:', err);
  }
}

importCards();