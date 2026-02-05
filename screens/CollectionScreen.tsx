import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  Pressable,
  Alert 
} from 'react-native';
import { useCardStorage } from '../hooks/useCardStorage';
import { COLORS } from '../utils/constants';
import { cardCodeParser } from '../utils/cardCodeParser';
import { CollectionScreenProps } from '../types/navigation.types';

export const CollectionScreen: React.FC<CollectionScreenProps> = ({ navigation }) => {
  const { recentCards, stats, refresh, deleteCard, clearAll } = useCardStorage();

  const handleDelete = (id: string, code: string) => {
    Alert.alert(
      'Eliminar carta',
      `¿Eliminar ${code}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => deleteCard(id)
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Limpiar colección',
      `¿Eliminar todas las ${stats.totalScans} cartas escaneadas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar todo', 
          style: 'destructive',
          onPress: clearAll
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Colección</Text>
        
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalScans}</Text>
            <Text style={styles.statLabel}>Escaneos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.uniqueCards}</Text>
            <Text style={styles.statLabel}>Únicas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.alternateArts}</Text>
            <Text style={styles.statLabel}>Alt Arts</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable 
            style={styles.actionButton}
            onPress={refresh}
          >
            <Text style={styles.actionButtonText}>🔄 Refrescar</Text>
          </Pressable>
          
          <Pressable 
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleClearAll}
          >
            <Text style={styles.actionButtonText}>🗑️ Limpiar Todo</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={recentCards}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable 
            style={styles.cardItem}
            onLongPress={() => handleDelete(item.id, item.code.fullCode)}
          >
            <View style={styles.cardInfo}>
              <Text style={styles.cardCode}>{item.code.fullCode}</Text>
              <Text style={styles.cardSet}>
                {cardCodeParser.getSetName(item.code.set)}
              </Text>
              <Text style={styles.cardTime}>
                {new Date(item.scannedAt).toLocaleString('es-ES')}
              </Text>
            </View>
            
            {item.hasAlternateArt && (
              <View style={styles.altArtBadge}>
                <Text style={styles.altArtText}>⭐ ALT</Text>
              </View>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              No hay cartas escaneadas aún
            </Text>
            <Text style={styles.emptySubtext}>
              Vuelve al escáner para comenzar
            </Text>
          </View>
        }
      />

      <Pressable 
        style={styles.floatingButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.floatingButtonText}>📸 Escanear</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#888',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cardItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.overlay,
    marginHorizontal: 20,
    marginVertical: 5,
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  cardInfo: {
    flex: 1,
  },
  cardCode: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardSet: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 3,
  },
  cardTime: {
    color: '#888',
    fontSize: 12,
  },
  altArtBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    justifyContent: 'center',
  },
  altArtText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  empty: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 10,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});