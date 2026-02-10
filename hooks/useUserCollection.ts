// src/hooks/useUserCollection.ts
import { useCallback, useEffect, useState } from 'react';
import { supabaseService } from '../services/supabaseService';
import { cardCodeParser } from '../utils/cardCodeParser';

export const useUserCollection = () => {
  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalCards: 0,
    uniqueCards: 0,
    altArts: 0,
    totalValue: 0,
  });

  const fetchCollection = useCallback(async () => {
    setLoading(true);
    const data = await supabaseService.getUserCollection();

    // Transformamos los datos crudos de la BBDD a lo que necesita la pantalla
    const formattedData = data.map((item: any) => ({
      id: item.id, // ID único de la colección
      scannedAt: item.scanned_at,
      isAltArt: item.is_alt_art,
      // Datos de la carta (que vienen unidos por Supabase)
      code: item.card.code,
      name: item.card.name,
      set: item.card.set_code,
      rarity: item.card.rarity,
      image: item.card.image_url,
      // Helper para obtener el set limpio
      parsedSet: cardCodeParser.parse(item.card.code)?.set || 'UNK'
    }));

    setCollection(formattedData);

    // Calculamos estadísticas al vuelo
    const uniqueIds = new Set(data.map((i: any) => i.card.id));
    
    setStats({
      totalCards: data.length,
      uniqueCards: uniqueIds.size,
      altArts: data.filter((i: any) => i.is_alt_art).length,
      totalValue: 0 // Pendiente para cuando tengamos precios
    });

    setLoading(false);
  }, []);

  const deleteCard = async (id: string) => {
    const success = await supabaseService.deleteFromCollection(id);
    if (success) {
      // Actualización optimista (borramos de la lista visualmente al instante)
      setCollection(prev => prev.filter(c => c.id !== id));
      setStats(prev => ({ ...prev, totalCards: prev.totalCards - 1 }));
    }
  };

  // Cargar datos al iniciar
  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  return {
    collection,
    stats,
    loading,
    refresh: fetchCollection,
    deleteCard
  };
};