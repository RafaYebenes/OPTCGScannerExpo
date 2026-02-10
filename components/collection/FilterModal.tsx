import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PALETTE } from '../../utils/theme';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  availableColors: string[];
  filterColor: string | null;
  setFilterColor: (color: string | null) => void;
  availableSets: string[];
  filterSet: string | null;
  setFilterSet: (set: string | null) => void;
  onClearAll: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  visible, onClose, availableColors, filterColor, setFilterColor,
  availableSets, filterSet, setFilterSet, onClearAll
}) => {
  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>FILTROS DEL CAPITÁN</Text>
          
          {/* COLORES */}
          <Text style={styles.filterSectionTitle}>COLOR</Text>
          <View style={styles.chipsContainer}>
            {availableColors.map(color => (
              <TouchableOpacity
                key={color}
                style={[styles.filterChip, filterColor === color && styles.filterChipActive]}
                onPress={() => setFilterColor(filterColor === color ? null : color)}
              >
                <Text style={[styles.filterChipText, filterColor === color && {color: PALETTE.deepOcean}]}>{color}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* SETS */}
          <Text style={styles.filterSectionTitle}>SETS DESCUBIERTOS</Text>
          <ScrollView style={{maxHeight: 150}} contentContainerStyle={styles.chipsContainer}>
            {availableSets.map(set => (
              <TouchableOpacity
                key={set}
                style={[styles.filterChip, filterSet === set && styles.filterChipActive]}
                onPress={() => setFilterSet(filterSet === set ? null : set)}
              >
                <Text style={[styles.filterChipText, filterSet === set && {color: PALETTE.deepOcean}]}>{set}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* BOTONES ACCIÓN */}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalBtnClear} onPress={onClearAll}>
              <Text style={styles.modalBtnTextClear}>LIMPIAR TODO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnApply} onPress={onClose}>
              <Text style={styles.modalBtnTextApply}>APLICAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: PALETTE.deepOcean, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%', borderTopWidth: 1, borderColor: PALETTE.gold },
  modalTitle: { color: PALETTE.gold, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, letterSpacing: 2 },
  filterSectionTitle: { color: PALETTE.lightBlue, fontSize: 12, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: PALETTE.glassBorder, backgroundColor: 'rgba(0,0,0,0.2)' },
  filterChipActive: { backgroundColor: PALETTE.cream, borderColor: PALETTE.cream },
  filterChipText: { color: PALETTE.cream, fontSize: 12, fontWeight: '600' },
  modalActions: { flexDirection: 'row', marginTop: 30, gap: 15 },
  modalBtnClear: { flex: 1, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: PALETTE.red, borderRadius: 12 },
  modalBtnTextClear: { color: PALETTE.red, fontWeight: 'bold' },
  modalBtnApply: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: PALETTE.gold, borderRadius: 12 },
  modalBtnTextApply: { color: PALETTE.deepOcean, fontWeight: 'bold' },
});