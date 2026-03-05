import { useCallback, useRef, useState } from 'react';
import { useCollection } from '../context/CollectionContext';
import { DetectionState } from '../types/card.types';
import { cardCodeParser } from '../utils/cardCodeParser';
import { SCANNER_CONFIG } from '../utils/constants';

export const useCardScanner = () => {
  const { addCard } = useCollection();

  const [detectionState, setDetectionState] = useState<DetectionState>({
    isDetecting: false,
    currentCode: null,
    confirmationCount: 0,
    lastSavedCode: null,
  });

  // Evita procesar el mismo código dos veces mientras está en cooldown
  const lastScannedRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);

  const processDetectedText = useCallback(async (text: string, isAltMode: boolean) => {
    if (!text || text.length < 5) return;

    const parsed = cardCodeParser.parse(text);

    if (!parsed) {
      // Nada reconocible: volvemos a idle si estábamos detectando
      setDetectionState(prev =>
        prev.isDetecting
          ? { ...prev, isDetecting: false, currentCode: null, confirmationCount: 0 }
          : prev
      );
      return;
    }

    const code = parsed.fullCode;

    // Si ya estamos procesando este código o acabamos de guardarlo, ignoramos
    if (isProcessingRef.current || code === lastScannedRef.current) return;

    // Actualizamos UI: "detectando / confirmando"
    setDetectionState(prev => ({
      ...prev,
      isDetecting: true,
      currentCode: code,
      confirmationCount: (prev.currentCode === code ? prev.confirmationCount : 0) + 1,
    }));

    // Marcamos como en proceso para evitar llamadas paralelas
    isProcessingRef.current = true;
    lastScannedRef.current = code;

    try {
      const result = await addCard(code, isAltMode);

      if (result.success) {
        // Éxito: mostramos el código guardado
        setDetectionState({
          isDetecting: false,
          currentCode: null,
          confirmationCount: 0,
          lastSavedCode: `${code}${isAltMode ? ' ★' : ''}`,
        });

        // Limpiamos el éxito tras SUCCESS_DISPLAY_MS
        setTimeout(() => {
          setDetectionState(prev => ({
            ...prev,
            lastSavedCode: null,
          }));
          lastScannedRef.current = null; // Permite re-escanear la misma carta
        }, SCANNER_CONFIG.SUCCESS_DISPLAY_MS);

      } else {
        // Error o duplicado: volvemos a idle
        setDetectionState({
          isDetecting: false,
          currentCode: null,
          confirmationCount: 0,
          lastSavedCode: null,
        });
        // En duplicado/error también liberamos el ref para no bloquear
        lastScannedRef.current = null;
      }

    } catch (_) {
      setDetectionState({
        isDetecting: false,
        currentCode: null,
        confirmationCount: 0,
        lastSavedCode: null,
      });
      lastScannedRef.current = null;
    } finally {
      isProcessingRef.current = false;
    }
  }, [addCard]);

  return {
    detectionState,
    processDetectedText,
  };
};