import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
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
import { useCollection } from '../context/CollectionContext';
import { cardCodeParser } from '../utils/cardCodeParser';

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

    // Datos seguros (por si faltan en DB)
    const cardData = item.card || {};
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

                        {/* Grid de Specs (Poder, Color, Tipo) */}
                        {/* Nota: Asumo que tendrás estos campos en DB. Si no, salen vacíos. */}
                        <View style={styles.specsGrid}>
                            <View style={styles.specBox}>
                                <Text style={styles.specLabel}>COLOR</Text>
                                <Text style={styles.specValue}>{cardData.color || '-'}</Text>
                            </View>
                            <View style={styles.specBox}>
                                <Text style={styles.specLabel}>PODER</Text>
                                <Text style={styles.specValue}>{cardData.power || '-'}</Text>
                            </View>
                            <View style={styles.specBox}>
                                <Text style={styles.specLabel}>TIPO</Text>
                                <Text style={styles.specValue}>{cardData.type || '-'}</Text>
                            </View>
                        </View>

                        {/* Efecto de la Carta */}
                        <View style={styles.effectContainer}>
                            <Text style={styles.specLabel}>EFECTO</Text>
                            <Text style={styles.effectText}>
                                {cardData.effect_text || "Sin descripción de efecto disponible en la base de datos."}
                            </Text>
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

    divider: { height: 1, backgroundColor: 'rgba(253, 240, 213, 0.1)', marginVertical: 20 },

    // GRID SPECS
    specsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    specBox: { alignItems: 'center', flex: 1 },
    specLabel: { color: 'rgba(253, 240, 213, 0.4)', fontSize: 9, fontWeight: '700', marginBottom: 4 },
    specValue: { color: THEME.cream, fontSize: 14, fontWeight: 'bold' },

    effectContainer: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 },
    effectText: { color: THEME.cream, fontSize: 13, lineHeight: 20, opacity: 0.9, marginTop: 4 },

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
});