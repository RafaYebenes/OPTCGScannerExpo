require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://umeajfuaweobyjeuopii.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2pDeJby3VymlDm8_5MEOAg_TdTd1DnC';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function syncSets() {
  console.log('📂 Escaneando Sets en cards.json...');
  
  try {
    const rawData = fs.readFileSync('cards.json', 'utf8');
    const cards = JSON.parse(rawData);
    
    // 1. Extraer todos los códigos de set únicos
    const uniqueSets = new Set();
    cards.forEach(card => {
        if (card.set) uniqueSets.add(card.set);
    });

    console.log(`📦 Encontrados ${uniqueSets.size} Sets únicos.`);

    // 2. Preparar filas para insertar
    const setsToInsert = Array.from(uniqueSets).map(setCode => ({
        code: setCode,
        name: `Set ${setCode}`, // Placeholder si no tenemos el nombre real
        release_date: '2024-01-01' // Fecha genérica para no fallar constraints
    }));

    // 3. Upsert (Insertar o Ignorar si ya existe)
    // Asumimos que la tabla 'sets' tiene 'code' como clave primaria o única
    const { error } = await supabase
        .from('sets')
        .upsert(setsToInsert, { onConflict: 'code', ignoreDuplicates: true });

    if (error) {
        console.error('❌ Error sincronizando sets:', error.message);
    } else {
        console.log('✅ Todos los sets han sido sincronizados en la base de datos.');
    }

  } catch (err) {
    console.error('🔥 Error:', err);
  }
}

syncSets();