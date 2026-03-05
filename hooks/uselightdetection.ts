import { useCallback, useRef, useState } from 'react';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
export type LightLevel = 'low' | 'medium' | 'good';

export interface LightConfig {
  level: LightLevel;
  throttleMs: number;        // Intervalo entre capturas
  suggestTorch: boolean;     // Recomendar activar flash
  exposureOffset: number;    // Compensación de exposición (-1 a +1)
  zoomMultiplier: number;    // Multiplicador del zoom neutral
  contrastBoost: boolean;    // Si aplicar preprocesado de contraste
}

// ─────────────────────────────────────────────
// CONFIGURACIONES POR NIVEL DE LUZ
// ─────────────────────────────────────────────
const LIGHT_CONFIGS: Record<LightLevel, LightConfig> = {
  low: {
    level: 'low',
    throttleMs: 600,
    suggestTorch: true,
    exposureOffset: 0.5,
    zoomMultiplier: 1.3,
    contrastBoost: true,
  },
  medium: {
    level: 'medium',
    throttleMs: 400,
    suggestTorch: false,
    exposureOffset: 0.2,
    zoomMultiplier: 1.4,
    contrastBoost: true,
  },
  good: {
    level: 'good',
    throttleMs: 300,
    suggestTorch: false,
    exposureOffset: 0,
    zoomMultiplier: 1.5,
    contrastBoost: false,
  },
};

// Config especial cuando el flash está activo:
// Parámetros óptimos fijos, sin adaptación dinámica.
// El flash ya compensa la luz — no queremos que el sistema
// oscile entre "buena luz" (por el flash) y "mala luz" (sin él).
const TORCH_ON_CONFIG: LightConfig = {
  level: 'good',
  throttleMs: 300,
  suggestTorch: false,
  exposureOffset: 0,        // Flash ya ilumina, no sobreexponer
  zoomMultiplier: 1.5,
  contrastBoost: false,
};

// ─────────────────────────────────────────────
// UMBRALES DE BRILLO (0-255)
// ─────────────────────────────────────────────
const BRIGHTNESS_THRESHOLDS = {
  LOW_MAX: 80,
  MEDIUM_MAX: 160,
};

// Histéresis: para subir de nivel necesitas superar el umbral + margen,
// para bajar necesitas caer por debajo del umbral - margen.
// Esto evita oscilaciones cuando el brillo está justo en el borde.
const HYSTERESIS_MARGIN = 15;

// Suavizado: muestras para promedio móvil
const SMOOTHING_WINDOW = 8; // Subido de 5 a 8 para más estabilidad

// Cooldown: mínimo de muestras en un nivel antes de permitir cambio
const MIN_SAMPLES_BEFORE_CHANGE = 3;

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────
export const useLightDetection = () => {
  const [lightConfig, setLightConfig] = useState<LightConfig>(LIGHT_CONFIGS.good);
  const [brightness, setBrightness] = useState(200);

  // Historial de muestras para suavizado
  const samplesRef = useRef<number[]>([]);
  const lastLevelRef = useRef<LightLevel>('good');
  const samplesAtCurrentLevelRef = useRef(0);
  const torchOnRef = useRef(false);

  /**
   * Clasifica brillo con histéresis para evitar oscilaciones.
   * Para SUBIR de nivel, el brillo debe superar umbral + margen.
   * Para BAJAR, debe caer por debajo de umbral - margen.
   */
  const classifyWithHysteresis = useCallback((avgBrightness: number, currentLevel: LightLevel): LightLevel => {
    const { LOW_MAX, MEDIUM_MAX } = BRIGHTNESS_THRESHOLDS;
    const margin = HYSTERESIS_MARGIN;

    if (currentLevel === 'low') {
      // Para subir de low → medium, necesita superar LOW_MAX + margen
      if (avgBrightness >= LOW_MAX + margin) {
        return avgBrightness >= MEDIUM_MAX + margin ? 'good' : 'medium';
      }
      return 'low';
    }

    if (currentLevel === 'medium') {
      // Para bajar a low, debe caer por debajo de LOW_MAX - margen
      if (avgBrightness < LOW_MAX - margin) return 'low';
      // Para subir a good, debe superar MEDIUM_MAX + margen
      if (avgBrightness >= MEDIUM_MAX + margin) return 'good';
      return 'medium';
    }

    // currentLevel === 'good'
    // Para bajar de good → medium, debe caer por debajo de MEDIUM_MAX - margen
    if (avgBrightness < MEDIUM_MAX - margin) {
      return avgBrightness < LOW_MAX - margin ? 'low' : 'medium';
    }
    return 'good';
  }, []);

  /**
   * Informa al hook si el flash está encendido.
   * Cuando torch está ON, congelamos los parámetros.
   */
  const setTorchState = useCallback((isOn: boolean) => {
    torchOnRef.current = isOn;

    if (isOn) {
      // Flash encendido → config fija, dejar de adaptar
      setLightConfig(TORCH_ON_CONFIG);
      // Limpiar muestras para que al apagar el flash
      // empiece a medir de cero, sin arrastrar datos del flash
      samplesRef.current = [];
      samplesAtCurrentLevelRef.current = 0;
    }
    // Si se apaga, no hacemos nada inmediato:
    // las siguientes llamadas a updateFromOCRResult
    // irán reconstruyendo el nivel real.
  }, []);

  /**
   * Actualiza el nivel de luz basándose en el resultado del OCR.
   */
  const updateFromOCRResult = useCallback((ocrTextLength: number, hasValidCode: boolean) => {
    // Si el flash está encendido, ignorar — ya tenemos config fija
    if (torchOnRef.current) return;

    // Heurística de brillo basada en resultado OCR
    let estimatedBrightness: number;
    if (hasValidCode && ocrTextLength > 20) {
      estimatedBrightness = 200;
    } else if (ocrTextLength > 10) {
      estimatedBrightness = 120;
    } else if (ocrTextLength > 3) {
      estimatedBrightness = 60;
    } else {
      estimatedBrightness = 40;
    }

    // Promedio móvil
    samplesRef.current.push(estimatedBrightness);
    if (samplesRef.current.length > SMOOTHING_WINDOW) {
      samplesRef.current.shift();
    }

    const avgBrightness = samplesRef.current.reduce((a, b) => a + b, 0) / samplesRef.current.length;
    const newLevel = classifyWithHysteresis(avgBrightness, lastLevelRef.current);

    setBrightness(Math.round(avgBrightness));

    // Solo cambiar nivel si es diferente Y llevamos suficientes muestras estables
    if (newLevel !== lastLevelRef.current) {
      samplesAtCurrentLevelRef.current++;
      if (samplesAtCurrentLevelRef.current >= MIN_SAMPLES_BEFORE_CHANGE) {
        lastLevelRef.current = newLevel;
        samplesAtCurrentLevelRef.current = 0;
        setLightConfig(LIGHT_CONFIGS[newLevel]);
      }
    } else {
      // Mismo nivel → resetear contador de cambio
      samplesAtCurrentLevelRef.current = 0;
    }
  }, [classifyWithHysteresis]);

  return {
    lightConfig,
    brightness,
    updateFromOCRResult,
    setTorchState,
  };
};