import {
  type Floss,
  type RGB,
  flossRgb,
  hexToRgb,
  nearestFloss,
} from "./palette";

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
const UNUSED_GRAY = "#B9B9B9";
const GUIDE = "#E07A4A";

function dist2(a: RGB, b: RGB): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function average(pixels: RGB[]): RGB {
  if (pixels.length === 0) return [0, 0, 0];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const p of pixels) {
    r += p[0];
    g += p[1];
    b += p[2];
  }
  const n = pixels.length;
  return [(r / n) | 0, (g / n) | 0, (b / n) | 0];
}

function channelRange(pixels: RGB[], ch: 0 | 1 | 2): number {
  let min = 255;
  let max = 0;
  for (const p of pixels) {
    const v = p[ch];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return max - min;
}

/** Median-cut palette of k colors. */
export function medianCut(pixels: RGB[], k: number): RGB[] {
  if (pixels.length === 0) return [];
  type Bucket = { pixels: RGB[] };
  const buckets: Bucket[] = [{ pixels: pixels.slice() }];
  while (buckets.length < k) {
    let splitAt = 0;
    let bestRange = -1;
    let bestCh: 0 | 1 | 2 = 0;
    for (let i = 0; i < buckets.length; i++) {
      const px = buckets[i].pixels;
      if (px.length < 2) continue;
      for (const ch of [0, 1, 2] as const) {
        const r = channelRange(px, ch);
        if (r > bestRange) {
          bestRange = r;
          splitAt = i;
          bestCh = ch;
        }
      }
    }
    if (bestRange <= 0) break;
    const bucket = buckets[splitAt];
    bucket.pixels.sort((a, b) => a[bestCh] - b[bestCh]);
    const mid = bucket.pixels.length >> 1;
    const left = bucket.pixels.slice(0, mid);
    const right = bucket.pixels.slice(mid);
    buckets.splice(splitAt, 1, { pixels: left }, { pixels: right });
  }
  return buckets.map((b) => average(b.pixels));
}

function nearestIndex(color: RGB, palette: RGB[]): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const d = dist2(color, palette[i]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function luminance(c: RGB): number {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export const DIM_MIN = 8;
export const DIM_MAX = 80;

export function clampDim(n: number): number {
  if (!Number.isFinite(n)) return DIM_MIN;
  return Math.max(DIM_MIN, Math.min(DIM_MAX, Math.round(n)));
}

export function sampleImage(
  img: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
): { width: number; height: number; pixels: RGB[] } {
  const w = clampDim(width);
  const h = clampDim(height);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D not available");
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const pixels: RGB[] = new Array(w * h);
  for (let i = 0; i < pixels.length; i++) {
    const o = i * 4;
    const a = data[o + 3];
    if (a < 20) {
      pixels[i] = AIDA_RGB;
    } else if (a < 255) {
      const t = a / 255;
      pixels[i] = [
        (data[o] * t + AIDA_RGB[0] * (1 - t)) | 0,
        (data[o + 1] * t + AIDA_RGB[1] * (1 - t)) | 0,
        (data[o + 2] * t + AIDA_RGB[2] * (1 - t)) | 0,
      ];
    } else {
      pixels[i] = [data[o], data[o + 1], data[o + 2]];
    }
  }
  return { width: w, height: h, pixels };
}

export function pixelsToPattern(
  width: number,
  height: number,
  pixels: RGB[],
  colorCount: number,
): Pattern {
  const k = Math.max(2, Math.min(colorCount, pixels.length));
  const reduced = medianCut(pixels, k);
  const mapped: RGB[] = pixels.map((p) => reduced[nearestIndex(p, reduced)]);
  const flossList = reduced.map((c) => nearestFloss(c[0], c[1], c[2]));
  const unique: Floss[] = [];
  const remap: number[] = [];
  for (const f of flossList) {
    const found = unique.findIndex((u) => u.code === f.code);
    if (found === -1) {
      remap.push(unique.length);
      unique.push(f);
    } else {
      remap.push(found);
    }
  }
  const cells = mapped.map((p) => {
    const qi = nearestIndex(p, reduced);
    return remap[qi];
  });
  const counts = new Array(unique.length).fill(0);
  for (const c of cells) counts[c]++;
  return { width, height, cells, palette: unique, counts };
}

export function imageToPattern(
  img: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
  colorCount: number,
): Pattern {
  const sampled = sampleImage(img, width, height);
  return pixelsToPattern(sampled.width, sampled.height, sampled.pixels, colorCount);
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
