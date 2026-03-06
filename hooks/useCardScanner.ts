// ─────────────────────────────────────────────────────────
// hooks/useCardScanner.ts — con detección de "carta no encontrada"
// ─────────────────────────────────────────────────────────
// CAMBIOS:
// - Distingue error "no existe en la base de datos" de otros errores
// - Expone notFoundCode para que ScannerScreen muestre el banner
// - Cooldown para el mismo código no encontrado (no spamear)
// - clearNotFound() para cerrar el banner
// ─────────────────────────────────────────────────────────

import { useCallback, useRef, useState } from 'react';
import { useCollection } from '../context/CollectionContext';
import { cardCodeParser } from '../utils/cardCodeParser';

// Cuánto tiempo ignorar un código que ya falló (evitar spam del banner)
const NOT_FOUND_COOLDOWN_MS = 10000; // 10 segundos

export const useCardScanner = () => {
  const { addCard } = useCollection();

  const [detectionState, setDetectionState] = useState({
    lastScanned: '',
    lastSavedCode: null as string | null,
    isProcessing: false,
    isAltArt: false,
    feedbackMessage: null as string | null,
    feedbackType: null as 'success' | 'error' | 'info' | null,
  });

  // ── NUEVO: estado de "carta no encontrada" ──
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [syncState, setSyncState] = useState<'syncing' | 'synced' | 'error'>('synced');

  // Caché de códigos que ya sabemos que no existen (evitar spam)
  const notFoundCacheRef = useRef<Map<string, number>>(new Map());

  /**
   * Comprueba si un código está en cooldown de "not found"
   */
  const isInNotFoundCooldown = useCallback((code: string): boolean => {
    const lastTime = notFoundCacheRef.current.get(code);
    if (!lastTime) return false;
    return Date.now() - lastTime < NOT_FOUND_COOLDOWN_MS;
  }, []);

  /**
   * Limpia el banner de "no encontrada"
   */
  const clearNotFound = useCallback(() => {
    setNotFoundCode(null);
  }, []);

  const processDetectedText = useCallback(
    async (text: string, isAltMode: boolean) => {
      if (!text || text.length < 5) return;

      const parsed = cardCodeParser.parse(text);

      if (parsed) {
        // Evitar procesar lo mismo repetidamente
        if (
          detectionState.isProcessing ||
          parsed.fullCode === detectionState.lastScanned
        ) {
          return;
        }

        // Si ya sabemos que este código no existe, no intentar de nuevo
        if (isInNotFoundCooldown(parsed.fullCode)) {
          return;
        }

        setDetectionState((prev) => ({
          ...prev,
          isProcessing: true,
          lastScanned: parsed.fullCode,
        }));

        try {
          setSyncState('syncing');
          const result = await addCard(parsed.fullCode, isAltMode);

          if (result.success) {
            // ── Éxito: carta guardada ──
            setDetectionState({
              lastScanned: parsed.fullCode,
              lastSavedCode: parsed.fullCode,
              isProcessing: false,
              isAltArt: isAltMode,
              feedbackMessage: `${parsed.fullCode} ${isAltMode ? '(AA)' : ''} GUARDADA`,
              feedbackType: 'success',
            });

            setShowSuccessModal(true);
            setSyncState('synced');

            setTimeout(() => {
              setDetectionState((prev) => ({ ...prev, lastScanned: '' }));
              setShowSuccessModal(false);
            }, 2000);
          } else {
            // ── Error: ¿es "carta no encontrada"? ──
            const message = result.message || '';
            const isNotFound =
              message.includes('no existe') ||
              message.includes('not found') ||
              message.includes('no encontrada');

            if (isNotFound) {
              // Carta no encontrada en BBDD → mostrar banner
              console.log(`[Scanner] Carta no encontrada: ${parsed.fullCode}`);
              notFoundCacheRef.current.set(parsed.fullCode, Date.now());
              setNotFoundCode(parsed.fullCode);

              setDetectionState((prev) => ({
                ...prev,
                isProcessing: false,
                lastScanned: '', // Permitir re-escanear otro código
                feedbackType: null,
              }));
            } else {
              // Otro tipo de error → silencioso
              console.log(`[Scanner] Error guardando ${parsed.fullCode}: ${message}`);
              setDetectionState((prev) => ({
                ...prev,
                isProcessing: false,
                feedbackType: null,
              }));
            }
            setSyncState('error');
          }
        } catch (error) {
          // Error de red u otro → silencioso
          console.log('[Scanner] Error inesperado:', error);
          setDetectionState((prev) => ({
            ...prev,
            isProcessing: false,
          }));
          setSyncState('error');
        }
      }
    },
    [addCard, detectionState.isProcessing, detectionState.lastScanned, isInNotFoundCooldown],
  );

  return {
    detectionState,
    processDetectedText,
    showSuccessModal,
    syncState,
    // ── NUEVO ──
    notFoundCode,
    clearNotFound,
  };
};