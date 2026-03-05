// hooks/useCardScanner.ts
// VERSIÓN 2 — Feedback optimista
// Timer de dismiss empieza al MOSTRAR el modal, no al terminar Supabase.
// Así el tiempo visible es siempre 1.5s independientemente de la red.

import { useCallback, useRef, useState } from 'react';
import { useCollection } from '../context/CollectionContext';
import { cardCodeParser } from '../utils/cardCodeParser';

type SyncState = 'syncing' | 'synced' | 'error';

const MODAL_VISIBLE_MS = 1500; // Tiempo total que se ve el modal

interface DetectionState {
  lastScanned: string;
  lastSavedCode: string | null;
  isProcessing: boolean;
  isAltArt: boolean;
  feedbackMessage: string | null;
  feedbackType: 'success' | 'error' | 'info' | null;
}

export const useCardScanner = () => {
  const { addCard } = useCollection();

  const [detectionState, setDetectionState] = useState<DetectionState>({
    lastScanned: '',
    lastSavedCode: null,
    isProcessing: false,
    isAltArt: false,
    feedbackMessage: null,
    feedbackType: null,
  });

  const [syncState, setSyncState] = useState<SyncState>('syncing');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const isProcessingRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processDetectedText = useCallback(
    async (text: string, isAltMode: boolean) => {
      if (!text || text.length < 5) return;

      const parsed = cardCodeParser.parse(text);
      if (!parsed) return;

      if (isProcessingRef.current || parsed.fullCode === detectionState.lastScanned) {
        return;
      }

      isProcessingRef.current = true;

      // Limpiar timer anterior
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }

      // ── FEEDBACK OPTIMISTA: mostrar modal INMEDIATAMENTE ──
      setDetectionState({
        lastScanned: parsed.fullCode,
        lastSavedCode: parsed.fullCode,
        isProcessing: true,
        isAltArt: isAltMode,
        feedbackMessage: `${parsed.fullCode} ${isAltMode ? '(AA)' : ''} GUARDADA`,
        feedbackType: 'success',
      });
      setSyncState('syncing');
      setShowSuccessModal(true);

      // ── DISMISS TIMER: empieza AHORA, no cuando Supabase termine ──
      dismissTimerRef.current = setTimeout(() => {
        setShowSuccessModal(false);
        setSyncState('syncing');
        setDetectionState(prev => ({ ...prev, lastScanned: '' }));
        isProcessingRef.current = false;
      }, MODAL_VISIBLE_MS);

      // ── GUARDAR EN BACKGROUND (no bloquea el dismiss) ──
      try {
        const result = await addCard(parsed.fullCode, isAltMode);

        if (result.success) {
          setSyncState('synced');
        } else {
          setSyncState('error');
          console.warn('[Scanner] Error al guardar:', result.message);
        }
      } catch (error) {
        setSyncState('error');
        console.error('[Scanner] Error de red:', error);
      } finally {
        setDetectionState(prev => ({ ...prev, isProcessing: false }));
      }
    },
    [addCard, detectionState.lastScanned]
  );

  return {
    detectionState,
    processDetectedText,
    showSuccessModal,
    syncState,
  };
};