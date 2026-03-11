// ============================================
// VARIANT DETECTOR — OPSCANNER
// ============================================
// Analiza el texto completo del OCR para detectar
// marcadores de variantes especiales (SP, Winner, Judge).
//
// IMPORTANTE: Este módulo NO detecta Manga (eso es por imagen)
// ni Parallel/Alt Art (eso es el toggle manual AA).
// Solo detecta variantes que tienen texto identificativo en la carta.
// ============================================

import { DetectedVariant, VariantDetectionResult } from '../types/card.types';

// --- PATRONES DE DETECCIÓN ---
// Ordenados por PRIORIDAD (el primero que haga match gana)

const VARIANT_PATTERNS: {
  variant: DetectedVariant;
  patterns: RegExp[];
  confidence: number;
}[] = [
  {
    // SP: Aparece como "SP" justo antes del código en la esquina inferior derecha.
    // Ejemplos reales: "SP OP10-030", "SP EB03-024"
    // También puede aparecer como texto suelto "SP" cerca del código.
    variant: 'SP',
    patterns: [
      /\bSP\s*(?:OP|EB|ST|PRB)\d{2}[-—]\d{3}/i,   // "SP OP10-030" — formato completo
      /\bSP\s+(?:OP|EB|ST|PRB)/i,                    // "SP OP..." — prefijo suelto
      /(?:^|\n)\s*SP\s*$/im,                          // "SP" solo en una línea (cerca del código)
    ],
    confidence: 0.95,
  },
  {
    // WINNER: Texto "WINNER" grande y dorado en la zona central de la carta.
    // Muy prominente, ML Kit lo captura bien.
    // Cuidado: No confundir con texto del efecto que pueda mencionar "win".
    variant: 'Winner',
    patterns: [
      /\bWINNER\b/i,  // Palabra completa "WINNER"
    ],
    confidence: 0.90,
  },
  {
    // JUDGE: Sello "ONE PIECE CARD GAME JUDGE" superpuesto en el arte.
    // Es un watermark estilizado, puede ser menos fiable en OCR.
    variant: 'Judge',
    patterns: [
      /\bJUDGE\b/i,                        // Palabra "JUDGE" sola
      /CARD\s*GAME\s*JUDGE/i,              // "CARD GAME JUDGE" (parte del sello)
      /ONE\s*PIECE.*JUDGE/i,               // "ONE PIECE...JUDGE"
    ],
    confidence: 0.85,
  },
];

// --- PALABRAS A EXCLUIR ---
// Contextos donde "JUDGE" o "WINNER" son parte del nombre/efecto de la carta,
// NO un marcador de variante.
const FALSE_POSITIVE_CONTEXTS: Record<string, RegExp[]> = {
  Judge: [
    /Vinsmoke\s*Judge/i,       // Personaje "Vinsmoke Judge"
    /Judge\s*Bao/i,            // Personaje
  ],
  // "Winner" no tiene falsos positivos conocidos en nombres de carta OPTCG
};

export const variantDetector = {
  /**
   * Detecta la variante de una carta analizando el texto OCR completo.
   *
   * @param ocrText - Texto completo devuelto por ML Kit
   * @returns VariantDetectionResult con la variante detectada (o null si es carta normal)
   */
  detectFromText(ocrText: string): VariantDetectionResult {
    if (!ocrText || ocrText.length < 3) {
      return { variant: null, confidence: 0, source: 'none' };
    }

    const text = ocrText.toUpperCase();

    for (const { variant, patterns, confidence } of VARIANT_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          // Verificar falsos positivos
          if (variant && this._isFalsePositive(variant, ocrText)) {
            continue;
          }

          return {
            variant,
            confidence,
            source: 'ocr',
          };
        }
      }
    }

    // No se detectó ninguna variante especial
    return { variant: null, confidence: 0, source: 'none' };
  },

  /**
   * Detecta si un código tiene formato de Promo (P-XXX).
   * Se llama después del parseo del código.
   *
   * @param setCode - El set parseado (ej: "P")
   * @returns VariantDetectionResult
   */
  detectFromCode(setCode: string): VariantDetectionResult {
    if (setCode === 'P') {
      return { variant: 'Promo', confidence: 1.0, source: 'code' };
    }
    return { variant: null, confidence: 0, source: 'none' };
  },

  /**
   * Combina detección de texto + código + imagen (manga).
   * Prioridad: código > OCR texto > imagen
   *
   * @param ocrText - Texto OCR completo
   * @param setCode - Set code parseado
   * @param isMangaByImage - Resultado del análisis de imagen (saturación)
   */
  detect(
    ocrText: string,
    setCode: string,
    isMangaByImage: boolean = false
  ): VariantDetectionResult {
    // 1. Prioridad máxima: detección por formato de código (Promos)
    const codeResult = this.detectFromCode(setCode);
    if (codeResult.variant) return codeResult;

    // 2. Segunda prioridad: detección por texto OCR (SP, Winner, Judge)
    const textResult = this.detectFromText(ocrText);
    if (textResult.variant) return textResult;

    // 3. Tercera prioridad: detección por imagen (Manga)
    if (isMangaByImage) {
      return { variant: 'Manga', confidence: 0.75, source: 'image' };
    }

    // 4. Nada detectado → carta normal (se aplica toggle AA si está activo)
    return { variant: null, confidence: 0, source: 'none' };
  },

  // --- HELPERS PRIVADOS ---

  _isFalsePositive(variant: string, ocrText: string): boolean {
    const contexts = FALSE_POSITIVE_CONTEXTS[variant];
    if (!contexts) return false;

    return contexts.some(pattern => pattern.test(ocrText));
  },
};