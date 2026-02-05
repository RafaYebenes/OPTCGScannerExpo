import React from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useCardStorage } from '../hooks/useCardStorage';
import { CollectionScreenProps } from '../types/navigation.types';
import { cardCodeParser } from '../utils/cardCodeParser';

// --- PALETA Y TEMA ---
const THEME = {
  bgApp: '#001d3d',                  // Fondo Profundo
  cardGlass: 'rgba(0, 48, 73, 0.6)', // Cristal semitransparente
  accentBlue: "#669bbc",             // Azul Claro
  accentRed: "#c1121f",              // Rojo Vivo
  textWhite: "#ffffff",
  textDim: "rgba(255,255,255,0.6)",
  borderColor: "rgba(102, 155, 188, 0.3)"
};

export const CollectionScreen: React.FC<CollectionScreenProps> = ({ navigation }) => {
  const { recentCards, stats, refresh, deleteCard, clearAll } = useCardStorage();

  const handleDelete = (id: string, code: string) => {
    Alert.alert('Eliminar carta', `¿Borrar ${code} de la colección?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteCard(id) },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('¡Cuidado!', `¿Borrar TODA la colección (${stats.totalScans} cartas)?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar Todo', style: 'destructive', onPress: clearAll },
    ]);
  };

  // Componente de Cabecera (Stats + Título)
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Mi Colección</Text>
        <Pressable onPress={handleClearAll} style={({pressed}) => [styles.iconButton, pressed && styles.iconPressed]}>
           <Text style={styles.trashIcon}>🗑️</Text>
        </Pressable>
      </View>

      {/* Panel de Estadísticas (Glass) */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalScans}</Text>
          <Text style={styles.statLabel}>CARTAS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.uniqueCards}</Text>
          <Text style={styles.statLabel}>ÚNICAS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#FFD700' }]}>{stats.alternateArts}</Text>
          <Text style={styles.statLabel}>ALT ARTS</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bgApp} />
      
      <FlatList
        data={recentCards}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        refreshing={false}
        onRefresh={refresh}
        renderItem={({ item }) => (
          <Pressable 
            style={({pressed}) => [styles.cardItem, pressed && styles.cardPressed]}
            onLongPress={() => handleDelete(item.id, item.code.fullCode)}
            delayLongPress={500}
          >
            {/* Tira lateral de color (Identidad Visual) */}
            <View style={[styles.cardAccentStrip, item.hasAlternateArt && styles.accentGold]} />
            
            <View style={styles.cardContent}>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardCode}>{item.code.fullCode}</Text>
                {item.hasAlternateArt && (
                  <View style={styles.altBadge}>
                    <Text style={styles.altBadgeText}>⭐ ALT</Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.cardSet}>
                {cardCodeParser.getSetName(item.code.set)}
              </Text>
              
              <Text style={styles.cardDate}>
                {new Date(item.scannedAt).toLocaleDateString()} • {new Date(item.scannedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Text>
            </View>
            
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Colección vacía</Text>
            <Text style={styles.emptySub}>Usa la cámara para añadir cartas</Text>
          </View>
        }
      />

      {/* Botón Flotante (FAB) */}
      <Pressable 
        style={({pressed}) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.fabIcon}>📷</Text>
      </Pressable>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bgApp,
  },
  listContent: {
    paddingBottom: 100, // Espacio para el FAB
  },
  
  // --- HEADER ---
  headerContainer: {
    padding: 24,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: THEME.textWhite,
    letterSpacing: 0.5,
  },
  iconButton: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  iconPressed: {
    backgroundColor: 'rgba(255,0,0,0.2)',
  },
  trashIcon: {
    fontSize: 18,
  },
  
  // --- STATS PANEL ---
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.cardGlass,
    borderRadius: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: THEME.borderColor,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: '60%',
    alignSelf: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.textWhite,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: THEME.accentBlue,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // --- CARD ITEM ---
  cardItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 48, 73, 0.4)', // Fondo semitransparente
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    height: 85, // Altura fija para consistencia
    alignItems: 'center',
  },
  cardPressed: {
    backgroundColor: 'rgba(0, 48, 73, 0.8)',
    transform: [{scale: 0.99}],
  },
  cardAccentStrip: {
    width: 4,
    height: '100%',
    backgroundColor: THEME.accentBlue,
  },
  accentGold: {
    backgroundColor: '#FFD700',
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardCode: {
    color: THEME.textWhite,
    fontSize: 19,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginRight: 10,
  },
  cardSet: {
    color: THEME.textDim,
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '500',
  },
  cardDate: {
    color: THEME.accentBlue,
    fontSize: 11,
    opacity: 0.7,
  },
  altBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  altBadgeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
  },
  chevron: {
    color: THEME.textDim,
    fontSize: 22,
    marginRight: 20,
    opacity: 0.4,
  },

  // --- EMPTY STATE ---
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    opacity: 0.6,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    color: THEME.textWhite,
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptySub: {
    color: THEME.textDim,
    marginTop: 8,
  },

  // --- FAB ---
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.accentBlue,
    justifyContent: 'center',
    alignItems: 'center',
    // Sombras premium
    shadowColor: THEME.accentBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  fabPressed: {
    transform: [{scale: 0.95}],
  },
  fabIcon: {
    fontSize: 26,
  },
});