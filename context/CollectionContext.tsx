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

type CollectionContextType = {
  collection: CollectionItem[];
  loading: boolean;
  refresh: () => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  updateQuantity: (id: string, newQuantity: number) => Promise<void>;
  stats: { totalCards: number; uniqueCards: number; altArts: number };
  addCard: (code: string, isFoil?: boolean) => Promise<{ success: boolean; message?: string }>;
};

const CollectionContext = createContext<CollectionContextType>({
  collection: [],
  loading: false,
  refresh: async () => { },
  deleteCard: async () => { },
  updateQuantity: async () => { },
  stats: { totalCards: 0, uniqueCards: 0, altArts: 0 },
  addCard: async () => ({ success: false, message: 'Función no implementada' })
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

  const updateQuantity = async (id: string, newQuantity: number) => {
    setCollection(prev => prev.map(item => {
      if (item.id === id) return { ...item, quantity: newQuantity };
      return item;
    }));

    if (newQuantity <= 0) {
      setCollection(prev => prev.filter(item => item.id !== id));
    }

    await supabaseService.updateCardQuantity(id, newQuantity);
  };

  // Esta es la función que estabas definiendo pero no compartías
  const addCard = async (code: string, isFoil: boolean = false) => {
    if (!user) return { success: false, message: 'Usuario no autenticado' };

    try {
      setLoading(true);
      const result = await supabaseService.addCardToCollection(user.id, code, isFoil);

      if (result.success) {
        await loadData(); // Recargamos usando loadData que es tu función interna
        return { success: true, message: 'Carta añadida' };
      } else {
        return { success: false, message: result.error || 'Error al añadir' };
      }

    } catch (e) {
      return { success: false, message: 'Error de conexión' };
    } finally {
      setLoading(false);
    }
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
    <CollectionContext.Provider
      value={{
        collection,
        loading,
        refresh: loadData,
        deleteCard,
        updateQuantity,
        stats,
        addCard, // <--- 🚨 ESTO ES LO QUE FALTABA 🚨
      }}
    >
      {children}
    </CollectionContext.Provider>
  );
};

export const useCollection = () => useContext(CollectionContext);