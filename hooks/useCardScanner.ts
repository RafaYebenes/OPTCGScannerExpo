// ============================================
// USE CARD SCANNER HOOK — OPSCANNER v3
// ============================================
//
// BUFFER DE CONFIRMACIÓN (3 lecturas):
//   El código debe leerse 3 veces consecutivas idénticas
//   antes de guardarse. Elimina falsos positivos y duplicados.
//
// MANGA DETECTION EN PARALELO:
//   En count=1 (primera lectura de un código nuevo) se lanza
//   imageAnalyzer en paralelo. Para cuando llega count=3
//   el resultado ya está listo. Zero overhead en el hot path.
//
// variantDetector es SÍNCRONO (solo regex, 0ms overhead).
//
// ============================================

import { useCallback, useRef, useState } from 'react';
import { useCollection } from '../context/CollectionContext';
import { DetectedVariant } from '../types/card.types';
import { cardCodeParser } from '../utils/cardCodeParser';
import { imageAnalyzer, MangaDetectionResult } from '../utils/imageAnalyzer';
import { variantDetector } from '../utils/VariantDetector';

// --- CONFIGURACIÓN ---
const CONFIRMATION_THRESHOLD = 1;
const COOLDOWN_AFTER_SAVE_MS = 2000;
const RESET_SCANNED_MS = 2500;

interface ConfirmationBuffer {
  code: string;
  count: number;
  variant: DetectedVariant;
  mangaPromise: Promise<MangaDetectionResult> | null;
  mangaResult: MangaDetectionResult | null;
}

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

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalCardCode, setModalCardCode] = useState('');
  const [modalIsAltArt, setModalIsAltArt] = useState(false);
  const [syncState, setSyncState] = useState<'saving' | 'synced' | 'error'>('saving');
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const clearNotFound = useCallback(() => setNotFoundCode(null), []);

  // --- BUFFER DE CONFIRMACIÓN ---
  const confirmationBuffer = useRef<ConfirmationBuffer>({
    code: '',
    count: 0,
    variant: null,
    mangaPromise: null,
    mangaResult: null,
  });

  const isProcessingRef = useRef(false);
  const lastSavedCodeRef = useRef('');
  const lastSaveTimestamp = useRef(0);

  const processDetectedText = useCallback(async (
    text: string,
    isAltMode: boolean,
    imagePath?: string
  ) => {
    if (!text || text.length < 5) return;
    if (isProcessingRef.current) return;

    // 1. Parsear código
    const parsed = cardCodeParser.parse(text);
    if (parsed) {
      console.log(`[Scanner] PARSED: ${parsed.fullCode} from text: "${text.substring(0, 80)}"`);
    }
    if (!parsed) return;

    const code = parsed.fullCode;

    // 2. Cooldown post-guardado
    const timeSinceLastSave = Date.now() - lastSaveTimestamp.current;
    if (code === lastSavedCodeRef.current && timeSinceLastSave < COOLDOWN_AFTER_SAVE_MS) {
      return;
    }

    // 3. Detección de variante por texto (síncrono, 0ms)
    let detectedVariant: DetectedVariant = null;

    if (parsed.hasSpPrefix) {
      detectedVariant = 'SP';
    } else {
      const detection = variantDetector.detect(text, parsed.set, false);
      detectedVariant = detection.variant;
    }

    // 4. BUFFER DE CONFIRMACIÓN
    const buffer = confirmationBuffer.current;

    if (buffer.code === code) {
      // ── Misma carta → incrementar ──
      buffer.count++;

      if (detectedVariant && !buffer.variant) {
        buffer.variant = detectedVariant;
      }

      // Si el análisis de manga terminó, capturar resultado (non-blocking)
      if (buffer.mangaPromise && !buffer.mangaResult) {
        buffer.mangaPromise
          .then(r => { buffer.mangaResult = r; })
          .catch(() => { });
      }

    } else {
      // ── Carta nueva → resetear buffer ──
      buffer.code = code;
      buffer.count = 1;
      buffer.variant = detectedVariant;
      buffer.mangaPromise = null;
      buffer.mangaResult = null;

      // ── count=1: Lanzar análisis de manga EN PARALELO ──
      // Solo si no hay variante por texto, no está en modo AA, y tenemos imagen.
      // Se lanza fire-and-forget: para cuando lleguemos a count=3 (~600ms)
      // el resultado ya estará listo.
      if (!detectedVariant && !isAltMode && imagePath) {
        buffer.mangaPromise = imageAnalyzer
          .analyzeMangaPotential(imagePath)
          .then(result => {
            buffer.mangaResult = result;
            return result;
          })
          .catch(() => {
            const fallback: MangaDetectionResult = { isManga: false, saturation: -1, confidence: 0 };
            buffer.mangaResult = fallback;
            return fallback;
          });
      }
    }

    // 5. ¿Suficientes confirmaciones?
    if (buffer.count < CONFIRMATION_THRESHOLD) return;

    // ══════════════════════════════════════
    // 6. CONFIRMADO — recoger datos del buffer
    // ══════════════════════════════════════
    let confirmedVariant = buffer.variant;

    // Comprobar resultado de manga (ya resuelto en paralelo)
    if (!confirmedVariant && buffer.mangaResult) {
      if (buffer.mangaResult.isManga && buffer.mangaResult.confidence > 0.5) {
        confirmedVariant = 'Manga';
      }
    }

    // Safety net: si la promise aún está en vuelo, esperar máx 100ms
    if (!confirmedVariant && buffer.mangaPromise && !buffer.mangaResult) {
      try {
        const result = await Promise.race([
          buffer.mangaPromise,
          new Promise<null>(resolve => setTimeout(() => resolve(null), 100)),
        ]);
        if (result && result.isManga && result.confidence > 0.5) {
          confirmedVariant = 'Manga';
        }
      } catch {
        // No es manga
      }
    }

    // Resetear buffer
    buffer.code = '';
    buffer.count = 0;
    buffer.variant = null;
    buffer.mangaPromise = null;
    buffer.mangaResult = null;

    // ══════════════════════════════════════
    // 7. GUARDAR
    // ══════════════════════════════════════
    isProcessingRef.current = true;

    setDetectionState(prev => ({
      ...prev,
      isProcessing: true,
      lastScanned: code,
    }));
    setNotFoundCode(null);

    try {
      // Setear código del modal ANTES de abrirlo
      setModalCardCode(code);
      setModalIsAltArt(isAltMode || confirmedVariant !== null);
      setShowSuccessModal(true);
      setSyncState('saving');

      const result = await addCard(code, isAltMode, confirmedVariant);

      if (result.success) {
        setSyncState('synced');

        lastSavedCodeRef.current = code;
        lastSaveTimestamp.current = Date.now();

        const variantTag = confirmedVariant ? ` (${confirmedVariant.toUpperCase()})` : '';
        const aaTag = (!confirmedVariant && isAltMode) ? ' (AA)' : '';

        setDetectionState({
          lastScanned: code,
          lastSavedCode: code,
          isProcessing: false,
          feedbackMessage: `${code}${variantTag}${aaTag} GUARDADA`,
          feedbackType: 'success',
          isAltArt: isAltMode || confirmedVariant !== null,
          detectedVariant: confirmedVariant,
        });

        setTimeout(() => setShowSuccessModal(false), 1800);
        setTimeout(() => {
          setDetectionState(prev => ({ ...prev, lastScanned: '' }));
        }, RESET_SCANNED_MS);

      } else {
        setSyncState('error');
        setTimeout(() => setShowSuccessModal(false), 1500);
        setNotFoundCode(code);

        setDetectionState(prev => ({
          ...prev,
          isProcessing: false,
          feedbackMessage: 'Carta no encontrada',
          feedbackType: 'error',
          detectedVariant: null,
        }));

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
    } finally {
      isProcessingRef.current = false;
    }
  }, [addCard]);

  return {
    detectionState,
    processDetectedText,
    showSuccessModal,
    modalCardCode,
    modalIsAltArt,
    syncState,
    notFoundCode,
    clearNotFound,
  };
};