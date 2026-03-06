// ─────────────────────────────────────────────────────────
// hooks/useScannerFrameProcessor.ts
// ─────────────────────────────────────────────────────────
// Frame Processor para análisis de brillo real.
//
// En cada frame (o cada N frames), usa vision-camera-resize-plugin
// para cropear una zona pequeña del centro del frame, convertirla
// a RGB, y calcular la luminosidad media.
//
// NO hace OCR — el OCR sigue por takePhoto() + crop.
// Este processor solo se encarga de alimentar el sistema de
// detección de luz con datos reales de los píxeles.
// ─────────────────────────────────────────────────────────

import { useFrameProcessor } from 'react-native-vision-camera';
import { useRunOnJS } from 'react-native-worklets-core';
import { useResizePlugin } from 'vision-camera-resize-plugin';

// Cada cuántos frames analizar brillo (1 de cada SKIP_FRAMES)
// A 30fps, con SKIP = 5 analizamos ~6 veces por segundo — más que suficiente.
const SKIP_FRAMES = 5;

// Tamaño del thumbnail para análisis de brillo.
// Cuanto más pequeño, más rápido. 32x32 = 1024 píxeles = 3072 bytes RGB.
const THUMB_SIZE = 32;

/**
 * Crea un Frame Processor que calcula brillo real de los píxeles.
 *
 * @param onBrightnessComputed - callback en el JS thread con el brillo (0-255)
 */
export const useScannerFrameProcessor = (
  onBrightnessComputed: (brightness: number) => void,
) => {
  const { resize } = useResizePlugin();
  const sendBrightness = useRunOnJS(onBrightnessComputed, [onBrightnessComputed]);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';

      // ── Throttle: solo procesar 1 de cada N frames ──
      // Usamos el timestamp del frame como proxy (no hay contador en worklets)
      // Alternativa simple: frame.timestamp modulo
      // Por ahora, usamos un approach basado en el timestamp:
      const ts = frame.timestamp;
      // timestamp está en nanoseconds; queremos ~6 análisis/segundo = cada ~166ms
      // 166ms = 166_000_000 ns
      if (ts % (166_000_000) > 33_000_000) return;
      // ^ Esto ejecuta aprox 1 de cada 5 frames a 30fps

      // ── Crop al centro del frame + resize a thumbnail ──
      // Cropeamos la zona central (~60% del frame) que es donde está la carta.
      // No necesitamos precisión — solo queremos una muestra representativa
      // de la iluminación de la escena.
      const cropMarginX = Math.round(frame.width * 0.2);
      const cropMarginY = Math.round(frame.height * 0.2);

      const pixels = resize(frame, {
        scale: {
          width: THUMB_SIZE,
          height: THUMB_SIZE,
        },
        crop: {
          x: cropMarginX,
          y: cropMarginY,
          width: frame.width - cropMarginX * 2,
          height: frame.height - cropMarginY * 2,
        },
        pixelFormat: 'rgb',
        dataType: 'uint8',
      });

      // ── Calcular luminosidad media ──
      // Fórmula de luminosidad percibida: 0.299R + 0.587G + 0.114B
      // Muestreamos cada 12 bytes (4 píxeles) para ser aún más rápido.
      const step = 12; // 4 píxeles × 3 canales
      let sum = 0;
      let count = 0;

      for (let i = 0; i < pixels.length - 2; i += step) {
        const r = pixels[i]!;
        const g = pixels[i + 1]!;
        const b = pixels[i + 2]!;
        // Weighted luminance (ITU-R BT.601)
        sum += 0.299 * r + 0.587 * g + 0.114 * b;
        count++;
      }

      const avgBrightness = count > 0 ? sum / count : 128;

      // ── Enviar resultado al JS thread ──
      sendBrightness(avgBrightness);
    },
    [resize, sendBrightness],
  );

  return frameProcessor;
};