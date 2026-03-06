// screens/collection/ArchetypeScreen.tsx
import { supabaseService } from '@/services/supabaseService';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { PALETTE } from '../../utils/theme';

// --- PALETA LOCAL (extensiones sobre PALETTE) ---
const THEME = {
    ...PALETTE,
    glassBorder: "rgba(253, 240, 213, 0.2)",
};

const { width } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GAP = 12;
const CARD_WIDTH = (width - (GAP * (NUM_COLUMNS + 1))) / NUM_COLUMNS;

// ============================================
// COMPONENTE: Placeholder ligero (Ancla estática + pulso RN Animated)
// ============================================
// UNA SOLA instancia de Animated.Value compartida por TODOS los placeholders
// para que no haya N animaciones corriendo en paralelo.
const _sharedPulse = new Animated.Value(0.3);
let _pulseRunning = false;

const startSharedPulse = () => {
    if (_pulseRunning) return;
    _pulseRunning = true;
    Animated.loop(
        Animated.sequence([
            Animated.timing(_sharedPulse, {
                toValue: 0.6,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(_sharedPulse, {
                toValue: 0.3,
                duration: 800,
                useNativeDriver: true,
            }),
        ])
    ).start();
};

const CardLoadingPlaceholder = () => {
    useEffect(() => {
        startSharedPulse();
    }, []);

    return (
        <View style={placeholderStyles.container}>
            <Animated.Text style={[placeholderStyles.anchorEmoji, { opacity: _sharedPulse }]}>
                ⚓
            </Animated.Text>
        </View>
    );
};

const placeholderStyles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    anchorEmoji: {
        fontSize: 24,
    },
});

// ============================================
// COMPONENTE: Card Item del Grid
// ============================================
const ArchetypeCardItem = ({ item, onPress }: { item: any; onPress: (item: any) => void }) => {
    const [imageLoaded, setImageLoaded] = useState(false);

    return (
        <Pressable
            style={({ pressed }) => [styles.cardContainer, pressed && { opacity: 0.7 }]}
            onPress={() => onPress(item)}
        >
            {/* Placeholder (visible mientras carga la imagen) */}
            {!imageLoaded && (
                <View style={[StyleSheet.absoluteFill, styles.placeholderBg]}>
                    <CardLoadingPlaceholder />
                </View>
            )}

            {/* Imagen real */}
            {item.image_url && (
                <View style={StyleSheet.absoluteFill}>
                    <Image
                        source={{ uri: item.image_url }}
                        style={styles.cardImage}
                        resizeMode="cover"
                        onLoad={() => setImageLoaded(true)}
                    />
                </View>
            )}

            {/* Si no hay URL de imagen */}
            {!item.image_url && (
                <View style={[StyleSheet.absoluteFill, styles.placeholderBg]}>
                    <CardLoadingPlaceholder />
                </View>
            )}

            {/* Borde */}
            <View style={styles.borderFrame} />

            {/* Badge inferior con código */}
            <View style={styles.glassBadge}>
                <Text style={styles.codeText}>{item.code}</Text>
            </View>
        </Pressable>
    );
};

// ============================================
// PANTALLA PRINCIPAL
// ============================================
export const ArchetypeScreen = ({ route, navigation }: any) => {
    const { archetype } = route.params;
    const [cards, setCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');

    // --- Cargar cartas del arquetipo ---
    useEffect(() => {
        const loadCards = async () => {
            setLoading(true);
            try {
                const data = await supabaseService.getCardsByArchetype(archetype);
                setCards(data);
            } catch (error) {
                console.error('Error cargando cartas del arquetipo:', error);
            } finally {
                setLoading(false);
            }
        };
        loadCards();
    }, [archetype]);

    // --- Filtrado local por búsqueda ---
    const filteredCards = useMemo(() => {
        if (!searchText.trim()) return cards;
        const query = searchText.toUpperCase();
        return cards.filter(card => {
            const matchName = card.name?.toUpperCase().includes(query);
            const matchCode = card.code?.toUpperCase().includes(query);
            const matchColor = card.color?.toUpperCase().includes(query);
            const matchType = card.type?.toUpperCase().includes(query);
            return matchName || matchCode || matchColor || matchType;
        });
    }, [cards, searchText]);

    // --- Navegación a CardDetail ---
    const handleCardPress = (card: any) => {
        const wrappedItem = {
            id: card.id,
            quantity: 0,
            is_foil: card.variant !== 'Normal',
            card: {
                id: card.id,
                code: card.code,
                name: card.name,
                set_code: card.set_code,
                rarity: card.rarity,
                variant: card.variant,
                image_url: card.image_url,
                market_price_eur: card.market_price_eur,
                color: card.color,
            },
            fromCatalog: true,
        };
        navigation.navigate('CardDetail', { item: wrappedItem });
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[PALETTE.deepOcean, PALETTE.navy, '#1e4d6b']}
                style={StyleSheet.absoluteFill}
            />

            <ScreenContainer bg="transparent" edges={['top', 'bottom']} padding={0}>
                {/* HEADER */}
                <View style={styles.header}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={styles.backText}>◀ VOLVER</Text>
                    </Pressable>

                    <View style={styles.titleContainer}>
                        <Text style={styles.subtitle}>ARQUETIPO</Text>
                        <Text style={styles.title} numberOfLines={2}>{archetype}</Text>
                    </View>
                </View>

                {/* BARRA DE BÚSQUEDA */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputContainer}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar (Nombre, Código, Color...)"
                            placeholderTextColor="rgba(253, 240, 213, 0.4)"
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                        {searchText.length > 0 && (
                            <Pressable onPress={() => setSearchText('')}>
                                <Text style={styles.clearIcon}>✕</Text>
                            </Pressable>
                        )}
                    </View>

                    {/* Contador */}
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>
                            {filteredCards.length} carta{filteredCards.length !== 1 ? 's' : ''}
                        </Text>
                    </View>
                </View>

                {/* CONTENIDO */}
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={PALETTE.gold} />
                        <Text style={styles.loadingText}>Buscando cartas...</Text>
                    </View>
                ) : filteredCards.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Text style={{ fontSize: 48 }}>🏴‍☠️</Text>
                        <Text style={styles.emptyText}>
                            {searchText ? 'Sin resultados para tu búsqueda' : 'No se encontraron cartas'}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredCards}
                        keyExtractor={(item) => item.id}
                        numColumns={NUM_COLUMNS}
                        columnWrapperStyle={styles.columnWrapper}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <ArchetypeCardItem item={item} onPress={handleCardPress} />
                        )}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </ScreenContainer>
        </View>
    );
};

// ============================================
// ESTILOS
// ============================================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PALETTE.deepOcean,
    },

    // --- HEADER ---
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 16,
    },
    backButton: {
        padding: 8,
        alignSelf: 'flex-start',
    },
    backText: {
        color: PALETTE.cream,
        fontWeight: 'bold',
        fontSize: 12,
        letterSpacing: 1,
    },
    titleContainer: {
        marginTop: 8,
    },
    subtitle: {
        color: PALETTE.lightBlue,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    title: {
        color: PALETTE.gold,
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 0.5,
        marginTop: 2,
    },

    // --- BÚSQUEDA ---
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: THEME.glassBorder,
        height: 44,
    },
    searchIcon: {
        fontSize: 14,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: PALETTE.cream,
        fontSize: 14,
    },
    clearIcon: {
        color: 'rgba(253, 240, 213, 0.5)',
        fontSize: 16,
        paddingLeft: 8,
    },
    countBadge: {
        marginTop: 8,
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(253, 240, 213, 0.08)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    countText: {
        color: PALETTE.lightBlue,
        fontSize: 11,
        fontWeight: '600',
    },

    // --- GRID ---
    columnWrapper: {
        justifyContent: 'flex-start',
        gap: GAP,
        paddingHorizontal: GAP,
    },
    listContent: {
        paddingBottom: 40,
        gap: GAP,
    },

    // --- CARD ITEM ---
    cardContainer: {
        width: CARD_WIDTH,
        aspectRatio: 63 / 88,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    cardImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    placeholderBg: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 8,
    },
    borderFrame: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    glassBadge: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        right: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(253, 240, 213, 0.15)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    codeText: {
        color: PALETTE.cream,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
    },

    // --- ESTADOS ---
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: PALETTE.cream,
        marginTop: 12,
        fontSize: 14,
        opacity: 0.7,
    },
    emptyText: {
        color: PALETTE.cream,
        marginTop: 12,
        fontSize: 14,
        opacity: 0.6,
        textAlign: 'center',
    },
});