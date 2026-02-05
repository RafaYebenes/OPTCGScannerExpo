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