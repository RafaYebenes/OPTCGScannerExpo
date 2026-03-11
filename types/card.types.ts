// ============================================
// TIPOS DE CARTA — OPSCANNER
// ============================================

export interface CardCode {
  set: string;
  number: string;
  fullCode: string;
}

export interface ScannedCard {
  id: string;
  code: CardCode;
  hasAlternateArt: boolean;
  scannedAt: number;
  confidence: number;
}

// --- NUEVO: Variantes detectables ---
export type DetectedVariant = 'SP' | 'Winner' | 'Judge' | 'Manga' | 'Promo' | null;

export interface VariantDetectionResult {
  variant: DetectedVariant;
  confidence: number;       // 0-1, confianza de la detección
  source: 'ocr' | 'image' | 'code' | 'none'; // Cómo se detectó
}

// Resultado combinado del parseo + detección de variante
export interface ScanResult {
  code: CardCode;
  detectedVariant: VariantDetectionResult;
  rawOcrText: string;
}

export interface DetectionState {
  isDetecting: boolean;
  currentCode: string | null;
  confirmationCount: number;
  lastSavedCode: string | null;
}

export interface ScannerConfig {
  confirmationThreshold: number;
  throttleMs: number;
  cooldownMs: number;
}