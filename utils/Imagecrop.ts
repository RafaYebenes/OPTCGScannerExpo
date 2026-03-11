// ─────────────────────────────────────────────────────────
// utils/imageCrop.ts — ROI Crop para OCR
// ─────────────────────────────────────────────────────────
// Cropea la foto de la cámara a la zona donde está el código
// de la carta (esquina inferior izquierda del overlay).
//
// En las cartas de One Piece TCG el código (ej: OP05-060)
// está en la esquina INFERIOR IZQUIERDA.
//
// En vez de pasar la foto entera (4032×3024) al OCR,
// recortamos solo esa esquina (~25% inferior, ~50% izquierdo)
// = ~1000×750 píxeles → OCR mucho más rápido y sin falsos positivos.
// ─────────────────────────────────────────────────────────

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Overlay dimensions (MUST match ScanOverlay.tsx) ──
const CARD_ASPECT_RATIO = 63 / 88;
const OVERLAY_WIDTH_RATIO = 0.85;
const OVERLAY_WIDTH = SCREEN_W * OVERLAY_WIDTH_RATIO;
const OVERLAY_HEIGHT = OVERLAY_WIDTH / CARD_ASPECT_RATIO;
const OVERLAY_X = (SCREEN_W - OVERLAY_WIDTH) / 2;
const OVERLAY_Y = (SCREEN_H - OVERLAY_HEIGHT) / 2;

// ── DEBUG: poner a true para ver logs detallados ──
const DEBUG_CROP = false;

// ── CROP MODE ──
// 'code_corner' = solo esquina inferior izquierda (rápido, preciso)
// 'full_card'   = toda el área del overlay (más lento, más seguro)
// Empezar con 'full_card' para validar que el mapeo funciona, (funciona mejor despues de pruebas, dejamos este)
// luego cambiar a 'code_corner' cuando esté confirmado.
type CropMode = 'code_corner' | 'full_card';
const CROP_MODE: CropMode = 'code_corner';  // ← CAMBIAR a 'code_corner' cuando funcione

function logDebug(label: string, data: any) {
  if (DEBUG_CROP) {
    console.log(`[ImageCrop] ${label}:`, JSON.stringify(data, null, 2));
  }
}

/**
 * Calcula la región de crop según el modo.
 */
function getCropRegionInScreen(): { x: number; y: number; width: number; height: number } {
  if (CROP_MODE === 'full_card') {
    const region = {
      x: OVERLAY_X,
      y: OVERLAY_Y,
      width: OVERLAY_WIDTH,
      height: OVERLAY_HEIGHT,
    };
    logDebug('Screen region (full_card)', region);
    logDebug('Screen dimensions', { SCREEN_W, SCREEN_H });
    logDebug('Overlay dimensions', {
      OVERLAY_WIDTH, OVERLAY_HEIGHT, OVERLAY_X, OVERLAY_Y,
    });
    return region;
  }

  // code_corner: esquina inferior DERECHA
  // Capturamos el 60% derecho y el 25% inferior del overlay.
  // Esto cubre: código, rareza, icono de set, y posible prefijo SP.
  const regionWidth = OVERLAY_WIDTH * 0.60;
  const regionHeight = OVERLAY_HEIGHT * 0.25;
  const region = {
    x: OVERLAY_X + OVERLAY_WIDTH - regionWidth,  // Empieza desde la DERECHA
    y: OVERLAY_Y + OVERLAY_HEIGHT - regionHeight, // Parte inferior
    width: regionWidth,
    height: regionHeight,
  };
  logDebug('Screen region (code_corner)', region);
  return region;
}

/**
 * Mapea coordenadas de pantalla a coordenadas de la foto real.
 */
function mapScreenToPhoto(
  screenRegion: { x: number; y: number; width: number; height: number },
  photoWidth: number,
  photoHeight: number,
) {
  const screenAspect = SCREEN_W / SCREEN_H;
  const photoAspect = photoWidth / photoHeight;

  let scale: number;
  let offsetX = 0;
  let offsetY = 0;

  if (photoAspect > screenAspect) {
    // Foto más ancha → se recorta horizontalmente
    scale = photoHeight / SCREEN_H;
    offsetX = (photoWidth - SCREEN_W * scale) / 2;
  } else {
    // Foto más alta → se recorta verticalmente
    scale = photoWidth / SCREEN_W;
    offsetY = (photoHeight - SCREEN_H * scale) / 2;
  }

  logDebug('Mapping info', {
    screenAspect: screenAspect.toFixed(3),
    photoAspect: photoAspect.toFixed(3),
    scale: scale.toFixed(3),
    offsetX: Math.round(offsetX),
    offsetY: Math.round(offsetY),
    photoSize: `${photoWidth}x${photoHeight}`,
  });

  // Margen extra del 10%
  const margin = 0.10;
  const marginX = Math.round(screenRegion.width * scale * margin);
  const marginY = Math.round(screenRegion.height * scale * margin);

  let cropX = Math.round(screenRegion.x * scale + offsetX) - marginX;
  let cropY = Math.round(screenRegion.y * scale + offsetY) - marginY;
  let cropW = Math.round(screenRegion.width * scale) + marginX * 2;
  let cropH = Math.round(screenRegion.height * scale) + marginY * 2;

  logDebug('Before clamp', { cropX, cropY, cropW, cropH });

  // Clamp to photo bounds
  cropX = Math.max(0, cropX);
  cropY = Math.max(0, cropY);
  cropW = Math.min(photoWidth - cropX, cropW);
  cropH = Math.min(photoHeight - cropY, cropH);

  const result = { originX: cropX, originY: cropY, width: cropW, height: cropH };
  logDebug('Final crop region (photo coords)', result);
  logDebug('Crop as % of photo', {
    x: `${((cropX / photoWidth) * 100).toFixed(1)}%`,
    y: `${((cropY / photoHeight) * 100).toFixed(1)}%`,
    w: `${((cropW / photoWidth) * 100).toFixed(1)}%`,
    h: `${((cropH / photoHeight) * 100).toFixed(1)}%`,
  });

  return result;
}

/**
 * Cropea la foto a la zona del código de la carta.
 */
export async function cropToCodeRegion(
  imageUri: string,
  photoWidth: number,
  photoHeight: number,
): Promise<string> {
  logDebug('=== cropToCodeRegion START ===', {
    imageUri: imageUri.substring(imageUri.length - 30),
    photoWidth,
    photoHeight,
    mode: CROP_MODE,
  });

  const screenRegion = getCropRegionInScreen();
  const cropRegion = mapScreenToPhoto(screenRegion, photoWidth, photoHeight);

  // Validar que el crop region tiene sentido
  if (cropRegion.width <= 0 || cropRegion.height <= 0) {
    console.warn('[ImageCrop] ⚠️ Invalid crop region! Using full image.');
    return imageUri;
  }

  if (cropRegion.width < 50 || cropRegion.height < 50) {
    console.warn('[ImageCrop] ⚠️ Crop region too small:', cropRegion);
    return imageUri;
  }

  try {
    const result = await manipulateAsync(
      imageUri,
      [{ crop: cropRegion }],
      { compress: 0.9, format: SaveFormat.JPEG },
    );

    logDebug('Crop result', {
      uri: result.uri.substring(result.uri.length - 30),
      width: result.width,
      height: result.height,
    });

    return result.uri;
  } catch (error: any) {
    console.error('[ImageCrop] ❌ manipulateAsync failed:', error?.message || error);
    console.error('[ImageCrop] Crop params were:', cropRegion);
    return imageUri; // Fallback
  }
}