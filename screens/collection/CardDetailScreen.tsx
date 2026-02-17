import { supabaseService } from '@/services/supabaseService';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Linking,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useCollection } from '../../context/CollectionContext';
import { cardCodeParser } from '../../utils/cardCodeParser';

// --- PALETA ---
const THEME = {
    deepOcean: "#001525",
    navy: "#003049",
    cream: "#fdf0d5",
    gold: "#FFD700",
    red: "#c1121f",
    glass: "rgba(0, 30, 50, 0.7)",
    glassBorder: "rgba(253, 240, 213, 0.2)",
    cardmarketBlue: "#00b4d8", // Color distintivo para el botón CM
};

const { width } = Dimensions.get('window');

export const CardDetailScreen = ({ route, navigation }: any) => {
    // --- PROTECCIÓN CONTRA CRASHES ---
    // Si route.params es undefined, evitamos el error crítico
    const item = route.params?.item;
    const [fullCardData, setFullCardData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    if (!item) {
        return (
            <View style={{ flex: 1, backgroundColor: '#001525', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fdf0d5', marginBottom: 20 }}>⚠️ No se ha seleccionado ninguna carta</Text>
                <Pressable onPress={() => navigation.goBack()} style={{ padding: 10, backgroundColor: '#fdf0d5', borderRadius: 8 }}>
                    <Text style={{ fontWeight: 'bold' }}>VOLVER</Text>
                </Pressable>
            </View>
        );
    }
    // ----------------------------------

    const { updateQuantity, deleteCard } = useCollection();
    const [qty, setQty] = useState(item.quantity);

    useEffect(() => {
        if (item.card) {
            // Usamos el 'code' para buscar la versión "Normal" y traer todos los campos
            supabaseService.getBaseCardByCode(item.card.code)
                .then(card => {
                    console.log("Datos completos de la carta obtenidos:", card);
                    if (card) {
                        setFullCardData(card);
                    }
                })
                .catch(e => console.warn("Error obteniendo datos extendidos:", e))
                .finally(() => setLoading(false));
        }
    }, [item]);

    // Fusionamos datos: prioridad a los datos completos de la DB, 
    // pero usamos los de item.card mientras cargan
    const cardData = fullCardData || item.card || {};
    const isAlt = item.is_foil;

    // Lógica de botones
    const handleQuantity = (delta: number) => {
        const newQty = qty + delta;
        if (newQty <= 0) {
            Alert.alert(
                "¿Eliminar carta?",
                "La cantidad llegará a 0 y se borrará de tu colección.",
                [
                    { text: "Cancelar", style: "cancel" },
                    {
                        text: "Eliminar",
                        style: "destructive",
                        onPress: () => {
                            deleteCard(item.id);
                            navigation.goBack();
                        }
                    }
                ]
            );
        } else {
            setQty(newQty);
            updateQuantity(item.id, newQty);
        }
    };

    const openCardmarket = () => {
        // AQUÍ USA TU LÓGICA DE CARDMARKET QUE YA TIENES
        // Ejemplo placeholder:
        const searchUrl = `https://www.cardmarket.com/en/OnePiece/Products/Search?searchString=${cardData.code}`;
        Linking.openURL(searchUrl);
    };


    const renderFormattedEffect = (text: string) => {
        if (!text) return <Text style={styles.effectText}>Sin descripción.</Text>;

        const cleanText = text.replace(/<br\s*\/?>/gi, '\n\n');
        const parts = cleanText.split(/(\[[^\]]+\]|\([^)]+\))/g);

        return (
            <Text style={styles.effectText}>
                {parts.map((part, index) => {
                    if (part.startsWith('[') && part.endsWith(']')) {
                        const innerText = part.slice(1, -1);
                        let badgeStyle: any = styles.defaultBadge;

                        // --- NUEVA LÓGICA DE COLORES CORREGIDA ---
                        if (innerText.match(/On Play/i)) badgeStyle = styles.onPlayBadge;
                        if (innerText.match(/Activate: Main|Main/i)) badgeStyle = styles.activateMainBadge;
                        if (innerText.match(/Once Per Turn/i)) badgeStyle = styles.oncePerTurnBadge;
                        if (innerText.match(/Blocker/i)) badgeStyle = styles.blockerBadge;
                        if (innerText.includes('DON!!')) badgeStyle = styles.donBadge;

                        return (
                            <View key={index} style={[styles.inlineBadge, badgeStyle]}>
                                <Text style={styles.badgeText}>{innerText.toUpperCase()}</Text>
                            </View>
                        );
                    }

                    if (part.startsWith('(') && part.endsWith(')')) {
                        return <Text key={index} style={styles.italicText}>{part}</Text>;
                    }

                    // Si el fragmento contiene ":" y es el inicio de una frase
                    if (part.includes(':')) {
                        const subParts = part.split(/(:)/); // Dividimos manteniendo los ":"
                        return (
                            <Text key={index}>
                                <Text style={styles.boldCondition}>{subParts[0]}{subParts[1]}</Text>
                                {subParts.slice(2).join('')}
                            </Text>
                        );
                    }

                    return <Text key={index}>{part}</Text>;
                })}
            </Text>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* FONDO IMAGEN (Blur o degradado) */}
            <LinearGradient
                colors={[THEME.deepOcean, THEME.navy, '#0f172a']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={{ flex: 1 }}>
                {/* HEADER NAV */}
                <View style={styles.navBar}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={styles.backText}>◀ VOLVER</Text>
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>

                    {/* 1. IMAGEN DE LA CARTA */}
                    <View style={styles.imageContainer}>
                        {cardData.image_url ? (
                            <Image
                                source={{ uri: cardData.image_url }}
                                style={[styles.cardImage, isAlt && styles.altBorder]}
                                resizeMode="contain"
                            />
                        ) : (
                            <View style={styles.placeholderImage}>
                                <Text style={{ fontSize: 40 }}>🏴‍☠️</Text>
                            </View>
                        )}
                        {/* Badge Rarity */}
                        <View style={styles.rarityBadge}>
                            <Text style={styles.rarityText}>{cardData.rarity || '??'}</Text>
                        </View>
                    </View>

                    {/* 2. BLOQUE DE INFORMACIÓN */}
                    <View style={styles.infoCard}>
                        {/* Títulos */}
                        <Text style={styles.cardCode}>{cardData.code}</Text>
                        <Text style={styles.cardName}>{cardData.name}</Text>
                        <Text style={styles.setName}>{cardCodeParser.getSetName(cardData.set_code)}</Text>

                        <View style={styles.divider} />

                        {/* SECCIÓN DE SPECS REDISEÑADA */}
                        <View style={styles.specsContainer}>
                            {/* Fila 1: Type (Feature) - Ocupa más espacio porque suele ser largo */}
                            <View style={styles.fullWidthSpec}>
                                <Text style={styles.specLabel}>TYPE</Text>
                                <View style={styles.typeBadgeContainer}>
                                    {cardData.feature ? (
                                        cardData.feature.split('/').map((type: string, index: number) => (
                                            <View key={index} style={styles.typeBadge}>
                                                <Text style={styles.typeBadgeText}>{type.trim()}</Text>
                                            </View>
                                        ))
                                    ) : (
                                        <Text style={styles.specValue}>-</Text>
                                    )}
                                </View>
                            </View>

                            {/* Fila 2: Chips de especificaciones rápidas */}
                            <View style={styles.specsChipsRow}>
                                <View style={styles.specChip}>
                                    <Text style={styles.specLabel}>COLOR</Text>
                                    <Text style={styles.specValue}>{cardData.color || '-'}</Text>
                                </View>
                                <View style={styles.specChip}>
                                    <Text style={styles.specLabel}>POWER</Text>
                                    <Text style={styles.specValue}>{cardData.power || '-'}</Text>
                                </View>
                                <View style={styles.specChip}>
                                    <Text style={styles.specLabel}>CLASS</Text>
                                    <Text style={styles.specValue}>{cardData.type || '-'}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Efecto de la Carta */}
                        <View style={styles.effectContainer}>
                            <Text style={styles.specLabel}>EFECTO</Text>
                            <View style={styles.effectTextWrapper}>
                                {renderFormattedEffect(cardData.effect)}
                            </View>
                        </View>
                    </View>
                </ScrollView>

                {/* 3. FOOTER FIJO (Acciones) */}
                <View style={styles.footer}>

                    {/* Precio y Cardmarket */}
                    <View style={styles.priceColumn}>
                        <Text style={styles.marketLabel}>MERCADO (AVG)</Text>
                        <Text style={styles.priceText}>
                            {cardData.market_price_eur ? `${cardData.market_price_eur} €` : 'N/A'}
                        </Text>
                        <Pressable onPress={openCardmarket} style={styles.cmButton}>
                            <Text style={styles.cmButtonText}>Ver en Cardmarket ↗</Text>
                        </Pressable>
                    </View>

                    {/* Selector Cantidad */}
                    <View style={styles.qtyContainer}>
                        <Text style={styles.qtyLabel}>EN POSESIÓN</Text>
                        <View style={styles.qtyControls}>
                            <Pressable onPress={() => handleQuantity(-1)} style={styles.qtyBtn}>
                                <Text style={styles.qtyBtnText}>-</Text>
                            </Pressable>

                            <Text style={styles.qtyValue}>{qty}</Text>

                            <Pressable onPress={() => handleQuantity(1)} style={styles.qtyBtn}>
                                <Text style={styles.qtyBtnText}>+</Text>
                            </Pressable>
                        </View>
                    </View>

                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: StatusBar.currentHeight || 0, backgroundColor: THEME.deepOcean },
    scrollContent: { paddingBottom: 150 },

    navBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
    backButton: { padding: 8 },
    backText: { color: THEME.cream, fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },

    specsContainer: {
        marginBottom: 20,
    },
    fullWidthSpec: {
        backgroundColor: 'rgba(253, 240, 213, 0.05)',
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
        borderLeftWidth: 2,
        borderLeftColor: THEME.gold,
    },
    specsChipsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    specChip: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(253, 240, 213, 0.1)',
    },
    specLabel: {
        color: 'rgba(253, 240, 213, 0.4)',
        fontSize: 9,
        fontWeight: '700',
        marginBottom: 2,
        textTransform: 'uppercase'
    },
    specValue: {
        color: THEME.cream,
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center'
    },

    fullWidthSpec: {
        backgroundColor: 'rgba(253, 240, 213, 0.05)',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        borderLeftWidth: 3,
        borderLeftColor: THEME.gold,
    },
    typeBadgeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap', // Para que si hay muchos tipos, bajen a la siguiente línea
        gap: 6,
        marginTop: 4,
    },
    typeBadge: {
        backgroundColor: '#0f4970',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(253, 240, 213, 0.2)',
    },
    typeBadgeText: {
        color: THEME.cream,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Ajuste al divider para que no pegue tanto
    divider: {
        height: 1,
        backgroundColor: 'rgba(253, 240, 213, 0.1)',
        marginVertical: 15
    },

    // IMAGEN
    imageContainer: { alignItems: 'center', marginTop: 10, marginBottom: 20 },
    cardImage: {
        width: width * 0.65,
        height: (width * 0.65) * (88 / 63),
        borderRadius: 12,
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.5)'
    },
    altBorder: { borderWidth: 3, borderColor: THEME.gold },
    placeholderImage: {
        width: width * 0.65, height: (width * 0.65) * (88 / 63),
        backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12,
        justifyContent: 'center', alignItems: 'center'
    },
    rarityBadge: {
        position: 'absolute', bottom: -10,
        backgroundColor: THEME.navy,
        paddingHorizontal: 12, paddingVertical: 4,
        borderRadius: 12, borderWidth: 1, borderColor: THEME.gold,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4
    },
    rarityText: { color: THEME.gold, fontWeight: '900', fontSize: 12 },

    // INFO CARD
    infoCard: {
        backgroundColor: THEME.glass,
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1, borderColor: THEME.glassBorder,
    },
    cardCode: { color: THEME.gold, fontSize: 12, fontWeight: 'bold', textAlign: 'center', letterSpacing: 1 },
    cardName: { color: THEME.cream, fontSize: 24, fontWeight: '900', textAlign: 'center', marginVertical: 4, textTransform: 'uppercase' },
    setName: { color: 'rgba(253, 240, 213, 0.6)', fontSize: 12, fontWeight: '600', textAlign: 'center', letterSpacing: 1 },


    // GRID SPECS
    specsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    specBox: { alignItems: 'center', flex: 1 },

    effectContainer: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 },

    // FOOTER
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#000F1A',
        borderTopWidth: 1, borderTopColor: THEME.glassBorder,
        flexDirection: 'row', padding: 10, paddingBottom: 43,
        justifyContent: 'space-between', alignItems: 'center'
    },
    priceColumn: { flex: 1, paddingRight: 20 },
    marketLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', marginBottom: 2 },
    priceText: { color: THEME.cream, fontSize: 22, fontWeight: 'bold' },

    cmButton: { marginTop: 8 },
    cmButtonText: { color: THEME.cardmarketBlue, fontSize: 12, fontWeight: 'bold' },

    qtyContainer: { alignItems: 'flex-end' },
    qtyLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', marginBottom: 6 },
    qtyControls: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: THEME.navy, borderRadius: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    qtyBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    qtyBtnText: { color: THEME.cream, fontSize: 18, fontWeight: 'bold' },
    qtyValue: { color: THEME.gold, fontSize: 18, fontWeight: 'bold', marginHorizontal: 4, minWidth: 20, textAlign: 'center' },

    // ... dentro de StyleSheet.create
    effectText: {
        color: THEME.cream,
        fontSize: 14,
        lineHeight: 24, // Altura de línea para que los badges respiren
        textAlign: 'left',
        opacity: 0.9, marginTop: 4
    },
    inlineBadge: {
        paddingHorizontal: 5,
        height: 16,               // Altura compacta para no sobresalir del texto
        borderRadius: 2,
        marginHorizontal: 2,
        justifyContent: 'center',
        alignItems: 'center',
        // --- AJUSTE DE ALINEACIÓN VERTICAL ---
        position: 'relative',
        top: 3,                   // Lo baja justo al centro del texto
        marginBottom: -3,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#FFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
        lineHeight: 10,           // Centrado interno del texto en el badge
    },

    // --- PALETA CORREGIDA ---
    defaultBadge: { backgroundColor: '#0071bc' },
    onPlayBadge: { backgroundColor: '#0071bc' },      // Azul On Play
    activateMainBadge: { backgroundColor: '#0084bd' }, // Azul/Cian Main
    oncePerTurnBadge: { backgroundColor: '#e60012' },  // Rojo/Rosa Once Per Turn
    blockerBadge: { backgroundColor: '#ca601e' },      // Naranja Blocker
    donBadge: {
        backgroundColor: '#000',
        borderWidth: 1,
        borderColor: THEME.gold
    },

    italicText: {
        color: 'rgba(253, 240, 213, 0.5)',
        fontStyle: 'italic',
    },

    boldCondition: {
        fontWeight: 'bold',        
    },
});