import type { RGB } from "../palette";

/** Fallback for transparent / near-transparent pixels (AIDA cloth). */
const AIDA_RGB: RGB = [243, 230, 201];

export type SampleMode = "nearest" | "area" | "adaptive";

export type SampleOptions = {
  mode?: SampleMode;
};

/**
 * True area averaging: each output pixel is the mean of its source region.
 * Avoids the blur/halos of canvas drawImage bilinear when downsampling hard
 * (e.g. 2048→16).
 */
function sampleArea(
  src: Uint8ClampedArray,
  sw: number,
  sh: number,
  tw: number,
  th: number,
): RGB[] {
  const out: RGB[] = new Array(tw * th);
  const xRatio = sw / tw;
  const yRatio = sh / th;

  for (let ty = 0; ty < th; ty++) {
    const sy0 = ty * yRatio;
    const sy1 = (ty + 1) * yRatio;
    const yStart = Math.floor(sy0);
    const yEnd = Math.min(sh, Math.ceil(sy1));

    for (let tx = 0; tx < tw; tx++) {
      const sx0 = tx * xRatio;
      const sx1 = (tx + 1) * xRatio;
      const xStart = Math.floor(sx0);
      const xEnd = Math.min(sw, Math.ceil(sx1));

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let weight = 0;

      for (let y = yStart; y < yEnd; y++) {
        const yWeight =
          Math.min(sy1, y + 1) - Math.max(sy0, y);
        if (yWeight <= 0) continue;
        for (let x = xStart; x < xEnd; x++) {
          const xWeight =
            Math.min(sx1, x + 1) - Math.max(sx0, x);
          if (xWeight <= 0) continue;
          const w = xWeight * yWeight;
          const o = (y * sw + x) * 4;
          r += src[o] * w;
          g += src[o + 1] * w;
          b += src[o + 2] * w;
          a += src[o + 3] * w;
          weight += w;
        }
      }

      const i = ty * tw + tx;
      if (weight <= 0) {
        out[i] = AIDA_RGB;
        continue;
      }
      const inv = 1 / weight;
      const alpha = a * inv;
      if (alpha < 20) {
        out[i] = AIDA_RGB;
      } else if (alpha < 255) {
        const t = alpha / 255;
        out[i] = [
          ((r * inv) * t + AIDA_RGB[0] * (1 - t)) | 0,
          ((g * inv) * t + AIDA_RGB[1] * (1 - t)) | 0,
          ((b * inv) * t + AIDA_RGB[2] * (1 - t)) | 0,
        ];
      } else {
        out[i] = [(r * inv) | 0, (g * inv) | 0, (b * inv) | 0];
      }
    }
  }
  return out;
}

/** Nearest-neighbor (pixel-perfect, can look blocky on photos). */
function sampleNearest(
  src: Uint8ClampedArray,
  sw: number,
  sh: number,
  tw: number,
  th: number,
): RGB[] {
  const out: RGB[] = new Array(tw * th);
  for (let ty = 0; ty < th; ty++) {
    const sy = Math.min(sh - 1, Math.floor((ty + 0.5) * (sh / th)));
    for (let tx = 0; tx < tw; tx++) {
      const sx = Math.min(sw - 1, Math.floor((tx + 0.5) * (sw / tw)));
      const o = (sy * sw + sx) * 4;
      const a = src[o + 3];
      const i = ty * tw + tx;
      if (a < 20) {
        out[i] = AIDA_RGB;
      } else if (a < 255) {
        const t = a / 255;
        out[i] = [
          (src[o] * t + AIDA_RGB[0] * (1 - t)) | 0,
          (src[o + 1] * t + AIDA_RGB[1] * (1 - t)) | 0,
          (src[o + 2] * t + AIDA_RGB[2] * (1 - t)) | 0,
        ];
      } else {
        out[i] = [src[o], src[o + 1], src[o + 2]];
      }
    }
  }
  return out;
}

/**
 * Adaptive: use area averaging when downsampling ≥ 1.5×,
 * nearest otherwise (preserves sharp pixel art / already-small sources).
 */
function resolveMode(
  mode: SampleMode,
  sw: number,
  sh: number,
  tw: number,
  th: number,
): "nearest" | "area" {
  if (mode === "nearest") return "nearest";
  if (mode === "area") return "area";
  const scale = Math.min(sw / tw, sh / th);
  return scale >= 1.5 ? "area" : "nearest";
}

/**
 * Sample an image into a target grid.
 * Uses real area averaging by default (adaptive) instead of canvas drawImage.
 */
export function sampleImage(
  img: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
  options: SampleOptions = {},
): { width: number; height: number; pixels: RGB[] } {
  const tw = Math.max(1, Math.round(width));
  const th = Math.max(1, Math.round(height));
  const mode = options.mode ?? "adaptive";

  // Read source pixels (full resolution; browser already decoded).
  const srcCanvas = document.createElement("canvas");
  const sw =
    "naturalWidth" in img && img.naturalWidth
      ? img.naturalWidth
      : img.width;
  const sh =
    "naturalHeight" in img && img.naturalHeight
      ? img.naturalHeight
      : img.height;
  srcCanvas.width = sw;
  srcCanvas.height = sh;
  const sctx = srcCanvas.getContext("2d", { willReadFrequently: true });
  if (!sctx) throw new Error("Canvas 2D not available");
  sctx.drawImage(img, 0, 0);
  const src = sctx.getImageData(0, 0, sw, sh).data;

  const resolved = resolveMode(mode, sw, sh, tw, th);
  const pixels =
    resolved === "area"
      ? sampleArea(src, sw, sh, tw, th)
      : sampleNearest(src, sw, sh, tw, th);

  return { width: tw, height: th, pixels };
}
