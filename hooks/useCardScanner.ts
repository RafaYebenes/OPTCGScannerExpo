import { useCallback, useRef, useState } from 'react';
import { Vibration } from 'react-native';
import { supabaseService } from '../services/supabaseService'; // <--- USAMOS EL NUEVO SERVICIO
import { DetectionState } from '../types/card.types';
import { cardCodeParser } from '../utils/cardCodeParser';
import { SCANNER_CONFIG } from '../utils/constants';

export const useCardScanner = () => {
  const [detectionState, setDetectionState] = useState<DetectionState>({
    isDetecting: false,
    currentCode: null,
    confirmationCount: 0,
    lastSavedCode: null,
  });

  const lastProcessTimeRef = useRef(0);
  const consecutiveDetectionsRef = useRef<Map<string, number>>(new Map());
  const lastSavedTimeRef = useRef<Map<string, number>>(new Map());

  const processDetectedText = useCallback((text: string) => {
    const now = Date.now();

    // 1. Control de FPS (Throttle)
    if (now - lastProcessTimeRef.current < SCANNER_CONFIG.THROTTLE_MS) {
      return;
    }
    lastProcessTimeRef.current = now;

    // 2. Intentar parsear el código
    const cardCode = cardCodeParser.parse(text);

    // Si no es un código válido, limpiamos y salimos
    if (!cardCode || !cardCodeParser.validate(cardCode)) {
      consecutiveDetectionsRef.current.clear();

      // Solo actualizamos estado si estábamos detectando algo antes (para evitar re-renders)
      if (detectionState.isDetecting) {
        setDetectionState(prev => ({
          ...prev,
          isDetecting: false,
          currentCode: null,
          confirmationCount: 0,
        }));
      }
      return;
    }

    const codeString = cardCode.fullCode;

    // 3. Cooldown: Si ya guardamos esta carta hace poco, la ignoramos
    const lastSavedTime = lastSavedTimeRef.current.get(codeString) || 0;
    if (now - lastSavedTime < SCANNER_CONFIG.COOLDOWN_MS) {
      return;
    }

    // 4. Lógica de Confirmación (requiere N lecturas seguidas)
    const currentCount = (consecutiveDetectionsRef.current.get(codeString) || 0) + 1;
    consecutiveDetectionsRef.current.set(codeString, currentCount);

    // Limpieza: Si detectamos una carta nueva, borramos el contador de las otras
    consecutiveDetectionsRef.current.forEach((_, key) => {
      if (key !== codeString) consecutiveDetectionsRef.current.delete(key);
    });

    // Actualizamos UI
    setDetectionState(prev => ({
      ...prev,
      isDetecting: true,
      currentCode: codeString,
      confirmationCount: currentCount,
      // Mantenemos el lastSavedCode para que la animación de éxito no desaparezca de golpe
    }));
    console.log(`🔍 Detectado: ${codeString} | Conteo: ${currentCount}`);
    // 5. ¡CONFIRMADO! Guardamos en la Nube
    if (currentCount >= SCANNER_CONFIG.CONFIRMATION_THRESHOLD) {
      console.log(`🔍 Detectado2: ${codeString} | Conteo: ${currentCount}`);

      // Detección básica de Alt Art (por si quieres implementarla luego con estrellas)
      const isAltArt = false;

      saveDetectedCardToCloud(codeString, isAltArt);

      // Reseteamos contadores para esta carta
      consecutiveDetectionsRef.current.clear();
      lastSavedTimeRef.current.set(codeString, now);
    }
  }, [detectionState.isDetecting, detectionState.lastSavedCode]); // Optimizamos dependencias

  const saveDetectedCardToCloud = useCallback(async (codeString: string, isAltArt: boolean) => {
    // 1. Feedback Físico Inmediato (Usuario feliz)
    Vibration.vibrate([0, 50, 50, 100]);
    console.log(`🎉 Carta detectada: ${codeString} | Alt Art: ${isAltArt}`);
    // 2. Guardado Asíncrono en Supabase
    // No esperamos con 'await' bloqueante para que la UI no se congele,
    // pero gestionamos la promesa.
    supabaseService.addCardToCollection(codeString, isAltArt).then((success) => {
      if (success) {
        console.log(`✅ Carta ${codeString} guardada en la nube`);
      } else {
        console.log(`❌ Error o duplicado al guardar ${codeString}`);
      }
    });

    // 3. Feedback Visual Inmediato
    setDetectionState(prev => ({
      ...prev,
      lastSavedCode: codeString,
      confirmationCount: 0,
    }));

    // 4. Ocultar mensaje de éxito tras unos segundos
    setTimeout(() => {
      setDetectionState(prev => ({
        ...prev,
        isDetecting: false,
        currentCode: null,
        lastSavedCode: null,
      }));
    }, SCANNER_CONFIG.SUCCESS_DISPLAY_MS);

  }, []);

  const reset = useCallback(() => {
    consecutiveDetectionsRef.current.clear();
    lastSavedTimeRef.current.clear();
    setDetectionState({
      isDetecting: false,
      currentCode: null,
      confirmationCount: 0,
      lastSavedCode: null,
    });
  }, []);

  return {
    detectionState,
    processDetectedText,
    reset,
  };
};