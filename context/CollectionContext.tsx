import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Image } from "react-native";

import { supabaseService } from "../services/supabaseService";
import { useAuth } from "./AuthContext";

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
    color: string;
  };
}

export type CardCatalogItem = {
  id: string;
  code: string;
  name: string;
  set_code: string | null;
  color: string | null;
  type: string | null;
  variant: string | null;
  image_url: string | null;
};

type CollectionContextType = {
  // Colección user
  collection: CollectionItem[];
  loading: boolean;
  refresh: () => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  updateQuantity: (id: string, newQuantity: number) => Promise<void>;
  stats: { totalCards: number; uniqueCards: number; altArts: number };
  addCard: (
    code: string,
    isFoil?: boolean,
  ) => Promise<{ success: boolean; message?: string }>;

  // ✅ Catálogo global (para Decks)
  cardCatalog: CardCatalogItem[];
  catalogLoading: boolean;
  loadCardCatalog: (opts?: { force?: boolean }) => Promise<void>;
};

const CollectionContext = createContext<CollectionContextType>({
  collection: [],
  loading: false,
  refresh: async () => {},
  deleteCard: async () => {},
  updateQuantity: async () => {},
  stats: { totalCards: 0, uniqueCards: 0, altArts: 0 },
  addCard: async () => ({ success: false, message: "Función no implementada" }),

  cardCatalog: [],
  catalogLoading: false,
  loadCardCatalog: async () => {},
});

const CATALOG_CACHE_KEY = "opcg_catalog_v1";
const CATALOG_CACHE_TS_KEY = "opcg_catalog_ts_v1";
const CATALOG_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export const CollectionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();

  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [cardCatalog, setCardCatalog] = useState<CardCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const catalogInFlight = useRef<Promise<void> | null>(null);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data =
        (await supabaseService.getUserCollection()) as unknown as CollectionItem[];

      // Prefetch SOLO imágenes de TU colección (no del catálogo entero)
      const imagePromises = data.map((item) => {
        if (item.card?.image_url) {
          return Image.prefetch(item.card.image_url).catch((e) =>
            console.warn(e),
          );
        }
        return Promise.resolve();
      });
      Promise.all(imagePromises);

      setCollection(data);
    } catch (error) {
      console.error("Error cargando colección:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCardCatalog = async (opts?: { force?: boolean }) => {
    const force = !!opts?.force;

    if (!user) return;
    if (catalogInFlight.current) return catalogInFlight.current;

    catalogInFlight.current = (async () => {
      try {
        if (!force && cardCatalog.length > 0) return;

        setCatalogLoading(true);

        // 1) cache
        if (!force) {
          const [cachedJson, cachedTs] = await Promise.all([
            AsyncStorage.getItem(CATALOG_CACHE_KEY),
            AsyncStorage.getItem(CATALOG_CACHE_TS_KEY),
          ]);

          if (cachedJson && cachedTs) {
            const age = Date.now() - parseInt(cachedTs, 10);
            if (!Number.isNaN(age) && age < CATALOG_TTL_MS) {
              const cached = JSON.parse(cachedJson) as CardCatalogItem[];
              setCardCatalog(cached);

              // refresh en background (no bloquea)
              setTimeout(async () => {
                const fresh =
                  (await supabaseService.getCardsCatalogAll()) as CardCatalogItem[];
                if (fresh?.length) {
                  setCardCatalog(fresh);
                  await AsyncStorage.setItem(
                    CATALOG_CACHE_KEY,
                    JSON.stringify(fresh),
                  );
                  await AsyncStorage.setItem(
                    CATALOG_CACHE_TS_KEY,
                    Date.now().toString(),
                  );
                }
              }, 0);

              return;
            }
          }
        }

        // 2) bajar de supabase
        const fresh =
          (await supabaseService.getCardsCatalogAll()) as CardCatalogItem[];
        setCardCatalog(fresh);

        await AsyncStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(fresh));
        await AsyncStorage.setItem(CATALOG_CACHE_TS_KEY, Date.now().toString());

        // (opcional) log del tamaño real
        const count = await supabaseService.getCardsCount();
        if (count) console.log(`📦 Catálogo cards (count): ${count}`);
        console.log(`📦 Catálogo cargado (rows): ${fresh.length}`);
      } catch (e) {
        console.error("❌ Error en loadCardCatalog:", e);
      } finally {
        setCatalogLoading(false);
        catalogInFlight.current = null;
      }
    })();

    return catalogInFlight.current;
  };

  const deleteCard = async (id: string) => {
    const success = await supabaseService.deleteFromCollection(id);
    if (success) {
      setCollection((prev) => prev.filter((item) => item.id !== id));
    } else {
      Alert.alert("Error", "No se pudo eliminar la carta.");
    }
  };

  const updateQuantity = async (id: string, newQuantity: number) => {
    setCollection((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item,
      ),
    );

    if (newQuantity <= 0) {
      setCollection((prev) => prev.filter((item) => item.id !== id));
    }

    await supabaseService.updateCardQuantity(id, newQuantity);
  };

  const addCard = async (code: string, isFoil: boolean = false) => {
    if (!user) return { success: false, message: "Usuario no autenticado" };

    try {
      setLoading(true);
      const result = await supabaseService.addCardToCollection(
        user.id,
        code,
        isFoil,
      );

      if (result.success) {
        await loadData();
        return { success: true, message: "Carta añadida" };
      } else {
        return { success: false, message: result.error || "Error al añadir" };
      }
    } catch (e) {
      return { success: false, message: "Error de conexión" };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
      // ✅ catálago se carga en paralelo, sin bloquear UI
      loadCardCatalog();
    } else {
      setCollection([]);
      setCardCatalog([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const stats = useMemo(
    () => ({
      totalCards: collection.reduce((acc, item) => acc + item.quantity, 0),
      uniqueCards: collection.length,
      altArts: collection.filter((item) => item.is_foil).length,
    }),
    [collection],
  );

  return (
    <CollectionContext.Provider
      value={{
        collection,
        loading,
        refresh: loadData,
        deleteCard,
        updateQuantity,
        stats,
        addCard,

        cardCatalog,
        catalogLoading,
        loadCardCatalog,
      }}
    >
      {children}
    </CollectionContext.Provider>
  );
};

export const useCollection = () => useContext(CollectionContext);
