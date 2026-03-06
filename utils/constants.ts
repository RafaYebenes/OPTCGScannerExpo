// ─────────────────────────────────────────────
// SCANNER CONFIG
// ─────────────────────────────────────────────
// NOTA: THROTTLE_MS ahora es el valor BASE (buena luz).
// useLightDetection devuelve el throttle dinámico real.
export const SCANNER_CONFIG = {
  CONFIRMATION_THRESHOLD: 1,
  THROTTLE_MS: 300,         // Base (buena luz). Low=600, Medium=400
  COOLDOWN_MS: 3000,
  SUCCESS_DISPLAY_MS: 2000,
  RECENT_CARDS_LIMIT: 5,
};

// ─────────────────────────────────────────────
// COLORES GENERALES
// ─────────────────────────────────────────────
export const COLORS = {
  success: '#00FF00',
  error: '#FF0000',
  primary: '#FF6B00',
  background: '#1a1a1a',
  overlay: 'rgba(0, 0, 0, 0.7)',
  scanArea: 'rgba(0, 255, 0, 0.1)',
};

// ─────────────────────────────────────────────
// LIGHT DETECTION CONFIG (exportada para tests)
// ─────────────────────────────────────────────
export const LIGHT_DETECTION = {
  SMOOTHING_WINDOW: 5,        // Muestras para promedio móvil
  BRIGHTNESS_LOW_MAX: 80,     // 0-80 = luz baja
  BRIGHTNESS_MEDIUM_MAX: 160, // 80-160 = luz media
                               // 160+ = buena luz
};