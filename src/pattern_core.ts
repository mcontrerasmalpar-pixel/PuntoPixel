import {
  type Floss,
  type RGB,
  nearestFloss,
} from "./palette";
import {
  preprocessImage,
  type ImageSettings,
  type BackgroundMode,
} from "./image/preprocess";
import {
  sampleImage as sampleImageCore,
  type SampleMode,
  type SampleOptions,
} from "./image/sampling";
import type { CropMode, FitMode } from "./image/crop";
import { quantizePixels, type PaletteMode } from "./engine/palette/auto";
import { nearestIndexLab } from "./engine/color/distance";
import { edgeImportanceMap } from "./engine/edge/sobel";
import { cleanupPattern } from "./engine/cleanup";

export type Pattern = {
  width: number;
  height: number;
  cells: number[];
  palette: Floss[];
  counts: number[];
};

export type PreviewKind = "tiles" | "chart";

export const AIDA = "#F3E6C9";
export const AIDA_RGB: RGB = [243, 230, 201];
export const PAPER = "#F6E4DC";
export const PAPER_PINK = "#F8E8E2";

export const DIM_MIN = 8;
export const DIM_MAX = 80;

export function clampDim(n: number): number {
  if (!Number.isFinite(n)) return DIM_MIN;
  return Math.max(DIM_MIN, Math.min(DIM_MAX, Math.round(n)));
}

export type { ImageSettings, SampleMode, SampleOptions, BackgroundMode };
export type { CropMode, FitMode };
export type { PaletteMode };
export { medianCut, buildAutoPalette } from "./engine/palette/auto";
export { colorDistance } from "./engine/color/distance";
export { cleanupPattern } from "./engine/cleanup";

/**
 * Sample image → target grid.
 * Default mode is "adaptive" (area averaging when downsampling hard).
 * Prefer imageToPattern / preprocessImage for the full pipeline.
 */
export function sampleImage(
  img: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
  options?: SampleOptions,
): { width: number; height: number; pixels: RGB[] } {
  const w = clampDim(width);
  const h = clampDim(height);
  return sampleImageCore(img, w, h, options ?? { mode: "adaptive" });
}

export function pixelsToPattern(
  width: number,
  height: number,
  pixels: RGB[],
  colorCount: number,
  paletteMode: PaletteMode = "auto",
): Pattern {
  const edgeMap = edgeImportanceMap(pixels, width, height);
  const { palette: reduced } = quantizePixels(pixels, {
    mode: paletteMode === "dmc" ? "auto" : paletteMode,
    colorCount,
    edgeMap,
  });

  // Map quantized colors → nearest DMC floss (perceptual ΔE)
  const flossList = reduced.map((c) => nearestFloss(c[0], c[1], c[2]));
  const unique: Floss[] = [];
  for (const f of flossList) {
    if (!unique.some((u) => u.code === f.code)) unique.push(f);
  }

  // Assign each pixel to nearest unique floss in Lab space
  const uniqueRgb: RGB[] = unique.map((f) => {
    const n = parseInt(f.hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as RGB;
  });
  const cells = pixels.map((p) => nearestIndexLab(p, uniqueRgb));
  const counts = new Array(unique.length).fill(0);
  for (const c of cells) counts[c]++;
  const raw: Pattern = { width, height, cells, palette: unique, counts };
  return cleanupPattern(raw);
}

export function imageToPattern(
  img: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
  colorCount: number,
  settings?: ImageSettings & { paletteMode?: PaletteMode },
): Pattern {
  const w = clampDim(width);
  const h = clampDim(height);
  const { paletteMode, ...imgSettings } = settings ?? {};
  const sampled = preprocessImage(img, w, h, {
    fit: "cover",
    sampleMode: "adaptive",
    ...imgSettings,
  });
  return pixelsToPattern(
    sampled.width,
    sampled.height,
    sampled.pixels,
    colorCount,
    paletteMode ?? "auto",
  );
}

/** Empty AIDA grid the user can paint cell-by-cell. */
export function createBlankPattern(
  width: number,
  height: number,
  fillFloss?: Floss,
): Pattern {
  const w = clampDim(width);
  const h = clampDim(height);
  const fill =
    fillFloss ?? nearestFloss(AIDA_RGB[0], AIDA_RGB[1], AIDA_RGB[2]);
  const cells = new Array(w * h).fill(0);
  return {
    width: w,
    height: h,
    cells,
    palette: [fill],
    counts: [w * h],
  };
}

export function ensureFloss(pattern: Pattern, floss: Floss): { pattern: Pattern; index: number } {
  const found = pattern.palette.findIndex((f) => f.code === floss.code);
  if (found !== -1) return { pattern, index: found };
  return {
    pattern: {
      ...pattern,
      palette: [...pattern.palette, floss],
      counts: [...pattern.counts, 0],
    },
    index: pattern.palette.length,
  };
}

/** Immutable cell update. Returns same reference if unchanged. */
export function setCell(
  pattern: Pattern,
  x: number,
  y: number,
  paletteIndex: number,
): Pattern {
  if (x < 0 || y < 0 || x >= pattern.width || y >= pattern.height) return pattern;
  if (paletteIndex < 0 || paletteIndex >= pattern.palette.length) return pattern;
  const i = y * pattern.width + x;
  const prev = pattern.cells[i];
  if (prev === paletteIndex) return pattern;
  const cells = pattern.cells.slice();
  cells[i] = paletteIndex;
  const counts = pattern.counts.slice();
  counts[prev]--;
  counts[paletteIndex]++;
  return { ...pattern, cells, counts };
}

/** Paint with a floss (adds to palette if needed). Pass null to restore AIDA/unused. */
export function paintCell(
  pattern: Pattern,
  x: number,
  y: number,
  floss: Floss | null,
): Pattern {
  if (floss == null) {
    const aida = nearestFloss(AIDA_RGB[0], AIDA_RGB[1], AIDA_RGB[2]);
    const { pattern: withAida, index } = ensureFloss(pattern, aida);
    return setCell(withAida, x, y, index);
  }
  const { pattern: withFloss, index } = ensureFloss(pattern, floss);
  return setCell(withFloss, x, y, index);
}
