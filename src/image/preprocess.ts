import type { RGB } from "../palette";
import {
  applyCropFit,
  type CropMode,
  type FitMode,
  type CropOptions,
} from "./crop";
import { sampleImage, type SampleMode, type SampleOptions } from "./sampling";

const AIDA_RGB: RGB = [243, 230, 201];

export type BackgroundMode = "original" | "remove" | "transparent";

export type ImageSettings = {
  crop?: CropMode;
  fit?: FitMode;
  background?: BackgroundMode;
  /** Contrast multiplier: 1 = none, >1 more contrast, <1 less. Typical 0.5–2. */
  contrast?: number;
  sampleMode?: SampleMode;
  customCrop?: { x: number; y: number; w: number; h: number };
};

const DEFAULT_SETTINGS: Required<
  Omit<ImageSettings, "customCrop">
> & { customCrop?: ImageSettings["customCrop"] } = {
  crop: "original",
  fit: "cover",
  background: "original",
  contrast: 1,
  sampleMode: "adaptive",
};

/**
 * Apply contrast around mid-gray (128).
 * factor = 1 → identity; 1.3 → punchier; 0.7 → flatter.
 */
function applyContrast(
  data: Uint8ClampedArray,
  factor: number,
): void {
  if (Math.abs(factor - 1) < 0.01) return;
  const mid = 128;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clampByte((data[i] - mid) * factor + mid);
    data[i + 1] = clampByte((data[i + 1] - mid) * factor + mid);
    data[i + 2] = clampByte((data[i + 2] - mid) * factor + mid);
  }
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

/**
 * Full preprocessing pipeline before quantization:
 *
 *   Image → Orientation (browser) → Crop / Fit → Contrast → Background → Sample
 *
 * Returns pixels ready for median-cut / palette snap.
 */
export function preprocessImage(
  img: HTMLImageElement | HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  settings: ImageSettings = {},
): { width: number; height: number; pixels: RGB[] } {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const tw = Math.max(1, Math.round(targetWidth));
  const th = Math.max(1, Math.round(targetHeight));

  const cropOpts: CropOptions = {
    crop: s.crop,
    fit: s.fit,
    targetAspect: tw / th,
    custom: s.customCrop,
  };

  // 1–2. Crop / Fit into a canvas of the target size (or intermediate)
  // We first build a high-res intermediate so area sampling still has detail.
  // Intermediate size: at least 4× target, capped to avoid huge canvases.
  const maxSide = Math.max(tw, th);
  const interScale = Math.min(4, Math.max(1, 512 / maxSide));
  const interW = Math.round(tw * interScale);
  const interH = Math.round(th * interScale);

  const bg =
    s.background === "remove" || s.background === "transparent"
      ? "transparent"
      : s.background === "original"
        ? "original"
        : AIDA_RGB;

  let canvas = applyCropFit(img, interW, interH, cropOpts, bg);

  // 3. Contrast
  if (Math.abs(s.contrast - 1) >= 0.01) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      const id = ctx.getImageData(0, 0, interW, interH);
      applyContrast(id.data, s.contrast);
      ctx.putImageData(id, 0, 0);
    }
  }

  // 4–5. Sample (area / adaptive / nearest) down to final grid
  const sampleOpts: SampleOptions = { mode: s.sampleMode };
  return sampleImage(canvas, tw, th, sampleOpts);
}

export type { CropMode, FitMode, SampleMode };
export { sampleImage } from "./sampling";
export { computeCropRect, applyCropFit } from "./crop";
