// ============================================
// IMAGE ANALYZER — OPSCANNER
// ============================================
// Analiza la saturación de color de una foto de carta
// para detectar cartas Manga (blanco y negro).
//
// Las cartas Manga tienen paneles de manga en B&N como fondo,
// lo que resulta en una saturación media MUY baja comparada
// con cartas normales (que son a todo color).
//
// FLUJO:
// 1. La cámara ya captura una foto para OCR
// 2. Reutilizamos esa misma foto para analizar saturación
// 3. Si saturación < umbral → posible Manga
// 4. La confirmación final se hace contra la BBDD
//
// NOTA: Usamos react-native-image-colors como alternativa ligera.
// Si no está disponible, se puede usar un approach con Canvas
// o directamente con la librería de procesamiento nativo.
// ============================================

// --- CONFIGURACIÓN ---
const MANGA_CONFIG = {
  // Umbral de saturación media (0-1).
  // Cartas manga (B&N): ~0.05-0.15
  // Cartas normales (color): ~0.35-0.70
  // Cartas holográficas: ~0.20-0.50 (variable por reflejos)
  SATURATION_THRESHOLD: 0.18,

  // Margen de seguridad: si la saturación está entre
  // THRESHOLD y THRESHOLD + MARGIN, marcamos confianza baja
  CONFIDENCE_MARGIN: 0.07,

  // Región de la imagen a analizar (centro, evitando bordes/funda)
  // Valores relativos 0-1 del tamaño de la imagen
  ANALYSIS_REGION: {
    x: 0.15,      // Empezar al 15% del ancho
    y: 0.15,      // Empezar al 15% del alto
    width: 0.70,  // Usar 70% del ancho
    height: 0.70, // Usar 70% del alto
  },
};

export interface MangaDetectionResult {
  isManga: boolean;
  saturation: number;    // Saturación media calculada (0-1)
  confidence: number;    // Confianza de la detección (0-1)
}

export const imageAnalyzer = {
  /**
   * Analiza si una imagen de carta es probablemente una carta Manga
   * basándose en la saturación de color.
   *
   * IMPLEMENTACIÓN CON react-native-image-colors:
   * Esta librería extrae colores dominantes de una imagen.
   * Los colores dominantes de una imagen B&N tendrán saturación ~0.
   *
   * @param imagePath - Ruta de la foto (file:///...)
   * @returns MangaDetectionResult
   */
  async analyzeMangaPotential(imagePath: string): Promise<MangaDetectionResult> {
    try {
      // Approach: Usar react-native-image-colors para extraer paleta dominante
      // y calcular saturación media de los colores extraídos.
      //
      // NOTA: Si react-native-image-colors no está instalado,
      // se puede usar el fallback con expo-image-manipulator + canvas.
      const ImageColors = require('react-native-image-colors');

      const result = await ImageColors.getColors(imagePath, {
        fallback: '#000000',
        cache: false,
        quality: 'low', // "low" es suficiente y más rápido
      });

      // Extraer los colores dominantes según la plataforma
      const colors = this._extractColors(result);

      if (colors.length === 0) {
        return { isManga: false, saturation: 1, confidence: 0 };
      }

      // Calcular saturación media de los colores dominantes
      const avgSaturation = this._calculateAverageSaturation(colors);

      // Determinar si es manga
      const { SATURATION_THRESHOLD, CONFIDENCE_MARGIN } = MANGA_CONFIG;

      if (avgSaturation < SATURATION_THRESHOLD) {
        // Claramente B&N → alta confianza
        const confidence = Math.min(
          0.95,
          0.7 + (SATURATION_THRESHOLD - avgSaturation) * 2
        );
        return { isManga: true, saturation: avgSaturation, confidence };
      }

      if (avgSaturation < SATURATION_THRESHOLD + CONFIDENCE_MARGIN) {
        // Zona gris → baja confianza (podría ser carta oscura, holográfica, etc.)
        return { isManga: true, saturation: avgSaturation, confidence: 0.4 };
      }

      // Carta a color → no es manga
      return { isManga: false, saturation: avgSaturation, confidence: 0 };

    } catch (error) {
      console.warn('⚠️ imageAnalyzer: Error analizando imagen, asumiendo no-manga:', error);
      // En caso de error, no bloqueamos el flujo: asumimos que no es manga
      return { isManga: false, saturation: -1, confidence: 0 };
    }
  },

  // --- HELPERS PRIVADOS ---

  /**
   * Extrae los colores hex del resultado de react-native-image-colors.
   * El formato del resultado varía entre iOS y Android.
   */
  _extractColors(result: any): string[] {
    const colors: string[] = [];

    if (!result) return colors;

    // Android devuelve: dominant, average, vibrant, darkVibrant, lightVibrant, etc.
    // iOS devuelve: background, primary, secondary, detail
    const possibleKeys = [
      'dominant', 'average', 'vibrant', 'darkVibrant', 'lightVibrant',
      'muted', 'darkMuted', 'lightMuted',
      'background', 'primary', 'secondary', 'detail',
    ];

    for (const key of possibleKeys) {
      if (result[key] && typeof result[key] === 'string' && result[key] !== '#000000') {
        colors.push(result[key]);
      }
    }

    return colors;
  },

  /**
   * Calcula la saturación media a partir de colores hex.
   * Convierte cada color de HEX → HSL y promedia la S.
   */
  _calculateAverageSaturation(hexColors: string[]): number {
    if (hexColors.length === 0) return 1;

    let totalSaturation = 0;
    let validCount = 0;

    for (const hex of hexColors) {
      const saturation = this._hexToSaturation(hex);
      if (saturation >= 0) {
        totalSaturation += saturation;
        validCount++;
      }
    }

    return validCount > 0 ? totalSaturation / validCount : 1;
  },

  /**
   * Convierte un color hex (#RRGGBB) a su valor de saturación HSL (0-1).
   */
  _hexToSaturation(hex: string): number {
    try {
      // Limpiar el hex
      const cleanHex = hex.replace('#', '');
      if (cleanHex.length < 6) return -1;

      const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
      const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
      const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2;

      if (max === min) {
        // Acromático (gris puro)
        return 0;
      }

      const d = max - min;
      const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      return s;
    } catch {
      return -1;
    }
  },
};