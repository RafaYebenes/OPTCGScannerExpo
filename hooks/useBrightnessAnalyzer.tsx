// ─────────────────────────────────────────────────────────
// hooks/useBrightnessAnalyzer.ts
// ─────────────────────────────────────────────────────────
// Frame Processor que analiza el brillo real de la escena
// usando los píxeles RGB del frame de la cámara.
//
// Reemplaza la heurística OCR del antiguo useLightDetection.
// Corre a la velocidad del frame rate de la cámara (~30fps)
// pero solo procesa 1 de cada N frames para no saturar.
// ─────────────────────────────────────────────────────────

import { useCallback, useRef, useState } from 'react';

export type LightLevel = 'low' | 'medium' | 'good';

export interface LightConfig {
  level: LightLevel;
  throttleMs: number;
  suggestTorch: boolean;
  exposureOffset: number;
  zoomMultiplier: number;
}

// ── Configs por nivel ──
const LIGHT_CONFIGS: Record<LightLevel, LightConfig> = {
  low: {
    level: 'low',
    throttleMs: 600,
    suggestTorch: true,
    exposureOffset: 0.5,
    zoomMultiplier: 1.3,
  },
  medium: {
    level: 'medium',
    throttleMs: 400,
    suggestTorch: false,
    exposureOffset: 0.2,
    zoomMultiplier: 1.4,
  },
  good: {
    level: 'good',
    throttleMs: 300,
    suggestTorch: false,
    exposureOffset: 0,
    zoomMultiplier: 1.5,
  },
};

// Config fija cuando el torch está encendido
const TORCH_ON_CONFIG: LightConfig = {
  level: 'good',
  throttleMs: 300,
  suggestTorch: false,
  exposureOffset: 0,
  zoomMultiplier: 1.5,
};

// ── Umbrales con histéresis ──
const THRESHOLDS = {
  LOW_MAX: 80,
  MEDIUM_MAX: 155,
  HYSTERESIS: 15,
};

const SMOOTHING_WINDOW = 8;
const MIN_SAMPLES_TO_CHANGE = 3;

// ── Hook ──
export const useBrightnessAnalyzer = () => {
  const [lightConfig, setLightConfig] = useState<LightConfig>(LIGHT_CONFIGS.good);
  const [brightness, setBrightness] = useState(200);

  const samplesRef = useRef<number[]>([]);
  const lastLevelRef = useRef<LightLevel>('good');
  const pendingChangeCountRef = useRef(0);
  const torchOnRef = useRef(false);

  const classifyWithHysteresis = useCallback(
    (avg: number, current: LightLevel): LightLevel => {
      const { LOW_MAX, MEDIUM_MAX, HYSTERESIS: H } = THRESHOLDS;

      if (current === 'low') {
        if (avg >= LOW_MAX + H)
          return avg >= MEDIUM_MAX + H ? 'good' : 'medium';
        return 'low';
      }
      if (current === 'medium') {
        if (avg < LOW_MAX - H) return 'low';
        if (avg >= MEDIUM_MAX + H) return 'good';
        return 'medium';
      }
      // good
      if (avg < MEDIUM_MAX - H)
        return avg < LOW_MAX - H ? 'low' : 'medium';
      return 'good';
    },
    [],
  );

  /**
   * Llamado desde el Frame Processor (vía runOnJS) con el brillo medio
   * real calculado a partir de los píxeles RGB del frame.
   */
  const onBrightnessComputed = useCallback(
    (realBrightness: number) => {
      if (torchOnRef.current) return;

      samplesRef.current.push(realBrightness);
      if (samplesRef.current.length > SMOOTHING_WINDOW) {
        samplesRef.current.shift();
      }

      const avg =
        samplesRef.current.reduce((a, b) => a + b, 0) /
        samplesRef.current.length;
      const newLevel = classifyWithHysteresis(avg, lastLevelRef.current);

      setBrightness(Math.round(avg));

      if (newLevel !== lastLevelRef.current) {
        pendingChangeCountRef.current++;
        if (pendingChangeCountRef.current >= MIN_SAMPLES_TO_CHANGE) {
          lastLevelRef.current = newLevel;
          pendingChangeCountRef.current = 0;
          setLightConfig(LIGHT_CONFIGS[newLevel]);
        }
      } else {
        pendingChangeCountRef.current = 0;
      }
    },
    [classifyWithHysteresis],
  );

  const setTorchState = useCallback((isOn: boolean) => {
    torchOnRef.current = isOn;
    if (isOn) {
      setLightConfig(TORCH_ON_CONFIG);
      samplesRef.current = [];
      pendingChangeCountRef.current = 0;
    }
  }, []);

  return {
    lightConfig,
    brightness,
    onBrightnessComputed,
    setTorchState,
  };
};