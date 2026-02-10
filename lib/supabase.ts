// src/lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// ⚠️ REEMPLAZA ESTO CON TUS CLAVES REALES DE SUPABASE
const SUPABASE_URL = "https://umeajfuaweobyjeuopii.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_2pDeJby3VymlDm8_5MEOAg_TdTd1DnC"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});