import { useCallback, useState } from 'react';
import { useCollection } from '../context/CollectionContext';
import { cardCodeParser } from '../utils/cardCodeParser';

export const useCardScanner = () => {
  const { addCard } = useCollection(); // Usamos la función del contexto
  
  const [detectionState, setDetectionState] = useState({
    lastScanned: '',
    lastSavedCode: null as string | null,
    isProcessing: false,
    feedbackMessage: null as string | null,
    feedbackType: null as 'success' | 'error' | 'info' | null,
  });

  // AHORA ACEPTAMOS isAltMode AQUÍ ⬇️
  const processDetectedText = useCallback(async (text: string, isAltMode: boolean) => {
    
    // 1. Limpieza básica para no procesar basura
    if (!text || text.length < 5) return;

    // 2. Parseamos el código (OP05-060)
    const parsed = cardCodeParser.parse(text);
    
    if (parsed) {
      // Evitar procesar lo mismo 20 veces seguidas muy rápido
      if (detectionState.isProcessing || parsed.fullCode === detectionState.lastScanned) {
        return;
      }

      setDetectionState(prev => ({ ...prev, isProcessing: true, lastScanned: parsed.fullCode }));

      try {
        // 3. LLAMAMOS A ADD CARD PASANDO EL MODO ALT ⬇️
        const result = await addCard(parsed.fullCode, isAltMode);

        if (result.success) {
           setDetectionState({
             lastScanned: parsed.fullCode,
             lastSavedCode: parsed.fullCode,
             isProcessing: false,
             feedbackMessage: `${parsed.fullCode} ${isAltMode ? '(AA)' : ''} GUARDADA`,
             feedbackType: 'success'
           });
           
           // Limpiamos el estado después de un momento para permitir escanear la misma carta de nuevo si se quiere
           setTimeout(() => {
             setDetectionState(prev => ({ ...prev, lastScanned: '' }));
           }, 2000);

        } else {
           throw new Error(result.message);
        }

      } catch (error) {
        setDetectionState(prev => ({
          ...prev,
          isProcessing: false,
          feedbackMessage: 'Error al guardar',
          feedbackType: 'error'
        }));
      }
    }
  }, [addCard, detectionState.isProcessing, detectionState.lastScanned]);

  return {
    detectionState,
    processDetectedText
  };
};