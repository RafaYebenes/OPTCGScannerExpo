import { supabaseService } from '@/services/supabaseService';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Linking,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { useCollection } from '../../context/CollectionContext';
import { cardCodeParser } from '../../utils/cardCodeParser';

const THEME = {
    deepOcean: "#001525",
    navy: "#003049",
    cream: "#fdf0d5",
    gold: "#FFD700",
    red: "#c1121f",
    glass: "rgba(0, 30, 50, 0.7)",
    glassBorder: "rgba(253, 240, 213, 0.2)",
    cardmarketBlue: "#00b4d8",
};

const { width } = Dimensions.get('window');

export const CardDetailScreen = ({ route, navigation }: any) => {
    const item = route.params?.item;

    // ✅ TODOS los hooks antes de cualquier return condicional
    const [fullCardData, setFullCardData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [qty, setQty] = useState(item?.quantity ?? 0);
    const [updating, setUpdating] = useState(false);       // ← NUEVO: evita doble-tap
    const insets = useSafeAreaInsets();
    const { updateQuantity, deleteCard } = useCollection();

    useEffect(() => {
        if (item?.card) {
            supabaseService.getBaseCardByCode(item.card.code)
                .then(card => { if (card) setFullCardData(card); })
                .catch(e => console.warn("Error obteniendo datos extendidos:", e))
                .finally(() => setLoading(false));
        }
    }, [item]);

    // ✅ return condicional DESPUÉS de todos los hooks
    if (!item) {
        return (
            <ScreenContainer bg={THEME.deepOcean} edges={['top', 'bottom']}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>⚠️ No se ha seleccionado ninguna carta</Text>
                    <Pressable onPress={() => navigation.goBack()} style={styles.errorBtn}>
                        <Text style={{ fontWeight: 'bold' }}>VOLVER</Text>
                    </Pressable>
                </View>
            </ScreenContainer>
        );
    }

    const cardData = fullCardData || item.card || {};
    const isAlt = item.is_foil;

    const handleQuantity = async (delta: number) => {
        if (updating) return;  // Evitar doble-tap

        const newQty = qty + delta;
        if (newQty <= 0) {
            Alert.alert(
                "¿Eliminar carta?",
                "La cantidad llegará a 0 y se borrará de tu colección.",
                [
                    { text: "Cancelar", style: "cancel" },
                    {
                        text: "Eliminar", style: "destructive",
                        onPress: async () => {
                            setUpdating(true);
                            await deleteCard(item.id);
                            navigation.goBack();
                        }
                    }
                ]
            );
            return;
        }

        // 1. Actualización optimista visual
        setQty(newQty);
        setUpdating(true);

        try {
            // 2. Persistir en DB via Context
            await updateQuantity(item.id, newQty);
        } catch (e) {
            // 3. Rollback visual si falla
            setQty(qty);
            Alert.alert("Error", "No se pudo actualizar la cantidad.");
        } finally {
            setUpdating(false);
        }
    };

    const openCardmarket = () => {
        const url = `https://www.cardmarket.com/en/OnePiece/Cards/${cardData.code}`;
        Linking.openURL(url).catch(() =>
            Alert.alert('Error', 'No se pudo abrir Cardmarket')
        );
    };

    const renderFormattedEffect = (effect: string) => {
        if (!effect) return <Text style={styles.effectText}>Sin efecto</Text>;

        const parts = effect.split(/(\[.*?\]|\(.*?\))/g);
        return (
            <Text style={styles.effectText}>
                {parts.map((part, index) => {
                    if (part.startsWith('[') && part.endsWith(']')) {
                        const innerText = part.slice(1, -1);
                        let badgeStyle = styles.defaultBadge;
                        if (innerText === 'DON!!') badgeStyle = styles.donBadge;
                        else if (['Trigger', 'Rush', 'Blocker', 'Banish', 'Double Attack'].includes(innerText))
                            badgeStyle = styles.keywordBadge;

                        return (
                            <View key={index} style={[styles.inlineBadge, badgeStyle]}>
                                <Text style={styles.badgeText}>{innerText.toUpperCase()}</Text>
                            </View>
                        );
                    }
                    if (part.startsWith('(') && part.endsWith(')'))
                        return <Text key={index} style={styles.italicText}>{part}</Text>;

                    if (part.includes(':')) {
                        const subParts = part.split(/(:)/);
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
        <View style={styles.root}>
            <StatusBar barStyle="light-content" />

            <LinearGradient
                colors={[THEME.deepOcean, THEME.navy, '#0f172a']}
                style={StyleSheet.absoluteFill}
            />

            <ScreenContainer
                bg="transparent"
                edges={['top', 'left', 'right']}
                padding={0}
            >
                <View style={styles.navBar}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={styles.backText}>◀ VOLVER</Text>
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>

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
                        <View style={styles.rarityBadge}>
                            <Text style={styles.rarityText}>{cardData.rarity || '??'}</Text>
                        </View>
                    </View>

                    <View style={styles.infoCard}>
                        <Text style={styles.cardCode}>{cardData.code}</Text>
                        <Text style={styles.cardName}>{cardData.name}</Text>
                        <Text style={styles.setName}>{cardCodeParser.getSetName(cardData.set_code)}</Text>

                        <View style={styles.divider} />

                        <View style={styles.specsContainer}>
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

                        <View style={styles.effectContainer}>
                            <Text style={styles.specLabel}>EFECTO</Text>
                            <View style={styles.effectTextWrapper}>
                                {renderFormattedEffect(cardData.effect)}
                            </View>
                        </View>
                    </View>
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
                    <View style={styles.priceColumn}>
                        <Text style={styles.marketLabel}>MERCADO (AVG)</Text>
                        <Text style={styles.priceText}>
                            {cardData.market_price_eur ? `${cardData.market_price_eur} €` : 'N/A'}
                        </Text>
                        <Pressable onPress={openCardmarket} style={styles.cmButton}>
                            <Text style={styles.cmButtonText}>Ver en Cardmarket ↗</Text>
                        </Pressable>
                    </View>

                    <View style={styles.qtyContainer}>
                        <Text style={styles.qtyLabel}>EN POSESIÓN</Text>
                        <View style={styles.qtyControls}>
                            <Pressable
                                onPress={() => handleQuantity(-1)}
                                style={[styles.qtyBtn, updating && styles.qtyBtnDisabled]}
                                disabled={updating}
                            >
                                <Text style={styles.qtyBtnText}>-</Text>
                            </Pressable>
                            <Text style={styles.qtyValue}>{qty}</Text>
                            <Pressable
                                onPress={() => handleQuantity(1)}
                                style={[styles.qtyBtn, updating && styles.qtyBtnDisabled]}
                                disabled={updating}
                            >
                                <Text style={styles.qtyBtnText}>+</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </ScreenContainer>
        </View>
    );
};

const styles = StyleSheet.create({
    root:            { flex: 1, backgroundColor: THEME.deepOcean },
    errorContainer:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText:       { color: THEME.cream, marginBottom: 20 },
    errorBtn:        { padding: 10, backgroundColor: THEME.cream, borderRadius: 8 },
    scrollContent:   { paddingBottom: 150 },
    navBar:          { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
    backButton:      { padding: 8 },
    backText:        { color: THEME.cream, fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },
    imageContainer:  { alignItems: 'center', marginTop: 10, marginBottom: 20 },
    cardImage: {
        width: width * 0.65,
        height: (width * 0.65) * (88 / 63),
        borderRadius: 12,
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.5)'
    },
    altBorder:       { borderWidth: 3, borderColor: THEME.gold },
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
    rarityText:      { color: THEME.gold, fontWeight: '900', fontSize: 12 },
    infoCard: {
        backgroundColor: THEME.glass,
        marginHorizontal: 16, borderRadius: 16, padding: 20,
        borderWidth: 1, borderColor: THEME.glassBorder,
    },
    cardCode:        { color: THEME.gold, fontSize: 12, fontWeight: 'bold', textAlign: 'center', letterSpacing: 1 },
    cardName:        { color: THEME.cream, fontSize: 24, fontWeight: '900', textAlign: 'center', marginVertical: 4, textTransform: 'uppercase' },
    setName:         { color: 'rgba(253, 240, 213, 0.6)', fontSize: 12, fontWeight: '600', textAlign: 'center', letterSpacing: 1 },
    divider:         { height: 1, backgroundColor: 'rgba(253, 240, 213, 0.1)', marginVertical: 15 },
    specsContainer:  { marginBottom: 20 },
    fullWidthSpec: {
        backgroundColor: 'rgba(253, 240, 213, 0.05)',
        padding: 12, borderRadius: 8, marginBottom: 10,
        borderLeftWidth: 3, borderLeftColor: THEME.gold,
    },
    specsChipsRow:   { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    specChip: {
        flex: 1, paddingVertical: 8, paddingHorizontal: 4,
        borderRadius: 8, alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(253, 240, 213, 0.1)',
    },
    specLabel:           { color: 'rgba(253, 240, 213, 0.4)', fontSize: 9, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase' },
    specValue:           { color: THEME.cream, fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
    typeBadgeContainer:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    typeBadge: {
        backgroundColor: '#0f4970', paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 4, borderWidth: 1, borderColor: 'rgba(253, 240, 213, 0.2)',
    },
    typeBadgeText:   { color: THEME.cream, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    effectContainer: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 },
    effectTextWrapper: { marginTop: 6 },
    effectText:      { color: THEME.cream, fontSize: 13, lineHeight: 20, opacity: 0.9 },
    inlineBadge:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginHorizontal: 2 },
    defaultBadge:    { backgroundColor: THEME.navy },
    donBadge:        { backgroundColor: THEME.red },
    keywordBadge:    { backgroundColor: '#0f4970' },
    badgeText:       { color: THEME.cream, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    italicText:      { color: 'rgba(253,240,213,0.6)', fontStyle: 'italic' },
    boldCondition:   { color: THEME.gold, fontWeight: '800' },
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#000F1A',
        borderTopWidth: 1, borderTopColor: THEME.glassBorder,
        flexDirection: 'row', padding: 10,
        justifyContent: 'space-between', alignItems: 'center',
    },
    priceColumn:     { flex: 1, paddingRight: 20 },
    marketLabel:     { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', marginBottom: 2 },
    priceText:       { color: THEME.cream, fontSize: 22, fontWeight: 'bold' },
    cmButton:        { marginTop: 8 },
    cmButtonText:    { color: THEME.cardmarketBlue, fontSize: 12, fontWeight: 'bold' },
    qtyContainer:    { alignItems: 'flex-end' },
    qtyLabel:        { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', marginBottom: 6 },
    qtyControls: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: THEME.navy, borderRadius: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    qtyBtn:          { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    qtyBtnDisabled:  { opacity: 0.4 },
    qtyBtnText:      { color: THEME.cream, fontSize: 18, fontWeight: 'bold' },
    qtyValue:        { color: THEME.gold, fontSize: 18, fontWeight: 'bold', marginHorizontal: 4, minWidth: 20, textAlign: 'center' },
});