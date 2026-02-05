import { useState, useRef, useCallback } from 'react';
import { Vibration } from 'react-native';
import { cardCodeParser } from '../utils/cardCodeParser';
import { storageService } from '../services/storageService';
import { SCANNER_CONFIG } from '../utils/constants';
import { ScannedCard, DetectionState } from '../types/card.types';
import { v4 as uuidv4 } from 'uuid';

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

    if (now - lastProcessTimeRef.current < SCANNER_CONFIG.THROTTLE_MS) {
      return;
    }
    lastProcessTimeRef.current = now;

    const cardCode = cardCodeParser.parse(text);
    
    if (!cardCode || !cardCodeParser.validate(cardCode)) {
      consecutiveDetectionsRef.current.clear();
      setDetectionState(prev => ({
        ...prev,
        isDetecting: false,
        currentCode: null,
        confirmationCount: 0,
      }));
      return;
    }

    const codeString = cardCode.fullCode;

    const lastSavedTime = lastSavedTimeRef.current.get(codeString) || 0;
    if (now - lastSavedTime < SCANNER_CONFIG.COOLDOWN_MS) {
      return;
    }

    const currentCount = (consecutiveDetectionsRef.current.get(codeString) || 0) + 1;
    consecutiveDetectionsRef.current.set(codeString, currentCount);

    consecutiveDetectionsRef.current.forEach((count, key) => {
      if (key !== codeString) {
        consecutiveDetectionsRef.current.delete(key);
      }
    });

    setDetectionState({
      isDetecting: true,
      currentCode: codeString,
      confirmationCount: currentCount,
      lastSavedCode: detectionState.lastSavedCode,
    });

    if (currentCount >= SCANNER_CONFIG.CONFIRMATION_THRESHOLD) {
      saveDetectedCard(cardCode);
      consecutiveDetectionsRef.current.clear();
      lastSavedTimeRef.current.set(codeString, now);
    }
  }, [detectionState.lastSavedCode]);

  const saveDetectedCard = useCallback(async (cardCode: any) => {
    const card: ScannedCard = {
      id: uuidv4(),
      code: cardCode,
      hasAlternateArt: false,
      scannedAt: Date.now(),
      confidence: 100,
    };

    const saved = await storageService.saveCard(card);

    if (saved) {
      Vibration.vibrate([0, 100, 50, 100]);

      setDetectionState(prev => ({
        ...prev,
        lastSavedCode: cardCode.fullCode,
        confirmationCount: 0,
      }));

      setTimeout(() => {
        setDetectionState(prev => ({
          ...prev,
          isDetecting: false,
          currentCode: null,
          lastSavedCode: null,
        }));
      }, SCANNER_CONFIG.SUCCESS_DISPLAY_MS);
    }
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