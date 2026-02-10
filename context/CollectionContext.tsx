import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Image } from 'react-native';
import { supabaseService } from '../services/supabaseService';
import { useAuth } from './AuthContext';

export interface CollectionItem {
  id: string;
  quantity: number;
  scanned_at: string;
  is_foil: boolean;
  condition: string;
  card: {
    id: string;
    code: string;
    name: string;
    set_code: string;
    rarity: string;
    variant: string;
    image_url: string;
    market_price_eur: number;
  };
}

// 1. CORRECCIÓN: Metemos updateQuantity DENTRO del tipo
type CollectionContextType = {
  collection: CollectionItem[];
  loading: boolean;
  refresh: () => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  updateQuantity: (id: string, newQuantity: number) => Promise<void>; // <--- AQUI
  stats: { totalCards: number; uniqueCards: number; altArts: number };
};

// 2. CORRECCIÓN: Añadimos el placeholder en el defaultValue
const CollectionContext = createContext<CollectionContextType>({
  collection: [],
  loading: false,
  refresh: async () => {},
  deleteCard: async () => {},
  updateQuantity: async () => {}, 
  stats: { totalCards: 0, uniqueCards: 0, altArts: 0 }
});

export const CollectionProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await supabaseService.getUserCollection() as unknown as CollectionItem[];
      
      const imagePromises = data.map(item => {
        if (item.card?.image_url) {
          return Image.prefetch(item.card.image_url).catch(e => console.warn(e));
        }
        return Promise.resolve();
      });
      Promise.all(imagePromises);

      setCollection(data as unknown as CollectionItem[]);
    } catch (error) {
      console.error('Error cargando colección:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteCard = async (id: string) => {
    const success = await supabaseService.deleteFromCollection(id);
    if (success) {
      setCollection(prev => prev.filter(item => item.id !== id));
    } else {
      Alert.alert("Error", "No se pudo eliminar la carta.");
    }
  };

  // 3. CORRECCIÓN: Implementamos la lógica real
  const updateQuantity = async (id: string, newQuantity: number) => {
    // Actualización Optimista (UI primero)
    setCollection(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));

    // Llamada a Supabase
    // Nota: Si baja a 0, supabaseService ya maneja el borrado, 
    // pero visualmente aquí podríamos filtrar si quantity <= 0
    if (newQuantity <= 0) {
        // Si es 0, la quitamos de la lista visualmente también
        setCollection(prev => prev.filter(item => item.id !== id));
    }

    await supabaseService.updateCardQuantity(id, newQuantity);
  };

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setCollection([]);
    }
  }, [user]);

  const stats = {
    totalCards: collection.reduce((acc, item) => acc + item.quantity, 0),
    uniqueCards: collection.length,
    altArts: collection.filter(item => item.is_foil).length,
  };

  return (
    // 4. CORRECCIÓN: Pasamos la función al Provider
    <CollectionContext.Provider 
      value={{ 
        collection, 
        loading, 
        refresh: loadData, 
        deleteCard, 
        updateQuantity, // <--- AQUI
        stats 
      }}
    >
      {children}
    </CollectionContext.Provider>
  );
};

export const useCollection = () => useContext(CollectionContext);