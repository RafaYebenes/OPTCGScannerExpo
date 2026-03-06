// ============================================
// USE CARD SCANNER HOOK — OPSCANNER (ACTUALIZADO)
// ============================================
// CAMBIOS vs versión actual en git:
// 1. processDetectedText acepta imagePath opcional (3er param)
// 2. Integra variantDetector para SP/Winner/Judge
// 3. Integra imageAnalyzer para Manga (saturación)
// 4. Pasa detectedVariant a addCard
// 5. Feedback incluye variante detectada
//
// MANTIENE: showSuccessModal, syncState, notFoundCode, clearNotFound
// ============================================

import { useCallback, useRef, useState } from 'react';
import { useCollection } from '../context/CollectionContext';
import { DetectedVariant } from '../types/card.types';
import { cardCodeParser } from '../utils/cardCodeParser';
import { imageAnalyzer } from '../utils/imageAnalyzer';
import { variantDetector } from '../utils/VariantDetector';

export const useCardScanner = () => {
  const { addCard } = useCollection();

  const [detectionState, setDetectionState] = useState({
    lastScanned: '',
    lastSavedCode: null as string | null,
    isProcessing: false,
    feedbackMessage: null as string | null,
    feedbackType: null as 'success' | 'error' | 'info' | null,
    isAltArt: false,
    detectedVariant: null as DetectedVariant,
  });

  // --- Success Modal ---
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [syncState, setSyncState] = useState<'saving' | 'synced' | 'error'>('saving');

  // --- Not Found ---
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);

  const clearNotFound = useCallback(() => setNotFoundCode(null), []);

  // Ref para evitar re-renders en el useCallback
  const stateRef = useRef(detectionState);
  stateRef.current = detectionState;

  /**
   * Procesa el texto detectado por OCR.
   *
   * @param text - Texto OCR completo
   * @param isAltMode - Estado del toggle AA
   * @param imagePath - Ruta de la foto (opcional, para detección de manga)
   */
  const processDetectedText = useCallback(async (
    text: string,
    isAltMode: boolean,
    imagePath?: string
  ) => {
    // 1. Limpieza básica
    if (!text || text.length < 5) return;

    // 2. Parsear código
    const parsed = cardCodeParser.parse(text);

    if (parsed) {
      // Evitar procesar la misma carta repetidamente
      if (stateRef.current.isProcessing || parsed.fullCode === stateRef.current.lastScanned) {
        return;
      }

      setDetectionState(prev => ({
        ...prev,
        isProcessing: true,
        lastScanned: parsed.fullCode,
      }));

      // Limpiar notFound anterior
      setNotFoundCode(null);

      try {
        // 3. DETECCIÓN DE VARIANTE
        let detectedVariant: DetectedVariant = null;

        // 3a. Si el parser detectó prefijo SP → alta confianza
        if (parsed.hasSpPrefix) {
          detectedVariant = 'SP';
        } else {
          // 3b. Detección por texto OCR (SP, Winner, Judge, Promo)
          const textDetection = variantDetector.detect(
            text,
            parsed.set,
            false
          );
          detectedVariant = textDetection.variant;
        }

        // 3c. Si no hay variante por texto y hay imagen → intentar Manga
        if (!detectedVariant && imagePath && !isAltMode) {
          try {
            const mangaResult = await imageAnalyzer.analyzeMangaPotential(imagePath);
            if (mangaResult.isManga && mangaResult.confidence > 0.5) {
              const fullDetection = variantDetector.detect(text, parsed.set, true);
              detectedVariant = fullDetection.variant;
            }
          } catch (imgErr) {
            // No bloquear el flujo si falla el análisis de imagen
            console.warn('[Scanner] Error en análisis de manga:', imgErr);
          }
        }

        // 4. Mostrar modal de éxito (estado saving)
        setShowSuccessModal(true);
        setSyncState('saving');

        // 5. Guardar — pasar variante detectada
        const result = await addCard(parsed.fullCode, isAltMode, detectedVariant);

        if (result.success) {
          setSyncState('synced');

          // Construir mensaje de feedback
          const variantTag = detectedVariant ? ` (${detectedVariant.toUpperCase()})` : '';
          const aaTag = (!detectedVariant && isAltMode) ? ' (AA)' : '';

          setDetectionState({
            lastScanned: parsed.fullCode,
            lastSavedCode: parsed.fullCode,
            isProcessing: false,
            feedbackMessage: `${parsed.fullCode}${variantTag}${aaTag} GUARDADA`,
            feedbackType: 'success',
            isAltArt: isAltMode || detectedVariant !== null,
            detectedVariant,
          });

          // Ocultar modal después de un momento
          setTimeout(() => setShowSuccessModal(false), 1800);

          // Reset para poder escanear la misma carta de nuevo
          setTimeout(() => {
            setDetectionState(prev => ({ ...prev, lastScanned: '' }));
          }, 2500);

        } else {
          setSyncState('error');
          setTimeout(() => setShowSuccessModal(false), 1500);

          // Carta no encontrada en BBDD
          setNotFoundCode(parsed.fullCode);

          setDetectionState(prev => ({
            ...prev,
            isProcessing: false,
            feedbackMessage: 'Carta no encontrada',
            feedbackType: 'error',
            detectedVariant: null,
          }));

          // Reset para reintentar
          setTimeout(() => {
            setDetectionState(prev => ({ ...prev, lastScanned: '' }));
          }, 3000);
        }

      } catch (error) {
        setSyncState('error');
        setTimeout(() => setShowSuccessModal(false), 1500);

        setDetectionState(prev => ({
          ...prev,
          isProcessing: false,
          feedbackMessage: 'Error al guardar',
          feedbackType: 'error',
          detectedVariant: null,
        }));
      }
    }
  }, [addCard]);

  return {
    detectionState,
    processDetectedText,
    showSuccessModal,
    syncState,
    notFoundCode,
    clearNotFound,
  };
};