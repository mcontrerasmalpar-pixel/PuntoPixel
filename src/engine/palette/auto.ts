import type { RGB } from "../color/rgb";
import { luminance, saturation } from "../color/rgb";
import { rgbToLab } from "../color/lab";
import { colorDistanceSq, nearestIndexLab } from "../color/distance";

export type PaletteMode = "auto" | "dmc" | "limited" | "custom";

export type PaletteOptions = {
  mode?: PaletteMode;
  /** Target number of colors (8 / 16 / 24 / 32). */
  colorCount?: number;
  /** Optional custom RGB seeds (mode === "custom"). */
  customColors?: RGB[];
  /** Edge importance map aligned with pixels (optional). */
  edgeMap?: Float32Array;
};

/**
 * Score a candidate color for inclusion in an auto palette.
 * Prefers: high edge weight, extreme luminance (outline/shadow/highlight),
 * saturation (skin/eyes accents), and spatial rarity vs already-picked colors.
 */
function candidateScore(
  rgb: RGB,
  edge: number,
  picked: RGB[],
): number {
  const [r, g, b] = rgb;
  const L = luminance(r, g, b);
  const sat = saturation(r, g, b);

  // Outline / shadow / highlight bias
  const extremeL = L < 0.12 || L > 0.88 ? 1.4 : L < 0.25 || L > 0.75 ? 1.15 : 1;
  // Saturated accents (eyes, clothing)
  const satBoost = 1 + sat * 0.8;
  // Edge importance
  const edgeBoost = 1 + edge * 2.5;

  // Diversity vs already picked (ΔE space)
  let minDist = Infinity;
  for (const p of picked) {
    const d = colorDistanceSq(rgb, p);
    if (d < minDist) minDist = d;
  }
  // ΔE² ~ 100 is roughly a noticeable difference; prefer far colors
  const diversity = picked.length === 0 ? 1 : Math.min(3, Math.sqrt(minDist) / 15);

  return extremeL * satBoost * edgeBoost * diversity;
}

/**
 * Build an auto palette that tries to keep outline, skin, eyes,
 * shadow, highlight and background — not just the most frequent colors.
 *
 * Strategy:
 * 1. Seed with darkest + lightest (outline / highlight / bg).
 * 2. Iteratively pick the highest-scoring remaining pixel average
 *    from median-cut-like buckets, weighted by edge + extremes.
 */
export function buildAutoPalette(
  pixels: RGB[],
  k: number,
  edgeMap?: Float32Array,
): RGB[] {
  if (pixels.length === 0) return [];
  const target = Math.max(2, Math.min(k, pixels.length));

  // Bucket pixels by coarse Lab bins for diversity
  type Bucket = { sum: RGB; weight: number; samples: RGB[] };
  const buckets = new Map<string, Bucket>();

  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i];
    const [L, a, b] = rgbToLab(p[0], p[1], p[2]);
    // Coarse quantization key
    const key = `${(L / 8) | 0}:${(a / 12) | 0}:${(b / 12) | 0}`;
    const edge = edgeMap ? edgeMap[i] ?? 0 : 0;
    const w = 1 + edge * 2;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { sum: [0, 0, 0], weight: 0, samples: [] };
      buckets.set(key, bucket);
    }
    bucket.sum[0] += p[0] * w;
    bucket.sum[1] += p[1] * w;
    bucket.sum[2] += p[2] * w;
    bucket.weight += w;
    if (bucket.samples.length < 8) bucket.samples.push(p);
  }

  const candidates: { rgb: RGB; edge: number; mass: number }[] = [];
  for (const bucket of buckets.values()) {
    if (bucket.weight <= 0) continue;
    const rgb: RGB = [
      (bucket.sum[0] / bucket.weight) | 0,
      (bucket.sum[1] / bucket.weight) | 0,
      (bucket.sum[2] / bucket.weight) | 0,
    ];
    // Representative edge = max among samples (or mass proxy)
    let edge = 0;
    for (const s of bucket.samples) {
      const sat = saturation(s[0], s[1], s[2]);
      const L = luminance(s[0], s[1], s[2]);
      edge = Math.max(edge, sat * 0.5 + (L < 0.15 || L > 0.9 ? 0.5 : 0));
    }
    candidates.push({ rgb, edge, mass: bucket.weight });
  }

  if (candidates.length === 0) return [pixels[0]];

  // Sort by luminance for seeds
  const byL = [...candidates].sort(
    (a, b) => luminance(a.rgb[0], a.rgb[1], a.rgb[2]) - luminance(b.rgb[0], b.rgb[1], b.rgb[2]),
  );

  const picked: RGB[] = [];
  // Seed: darkest (outline/shadow) + lightest (highlight/bg)
  picked.push(byL[0].rgb);
  if (target > 1) picked.push(byL[byL.length - 1].rgb);

  // Greedy: keep adding highest score
  while (picked.length < target && picked.length < candidates.length) {
    let bestI = -1;
    let bestScore = -1;
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      // Skip near-duplicates
      let tooClose = false;
      for (const p of picked) {
        if (colorDistanceSq(c.rgb, p) < 25) {
          // ΔE < ~5
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;
      const score = candidateScore(c.rgb, c.edge, picked) * Math.log1p(c.mass);
      if (score > bestScore) {
        bestScore = score;
        bestI = i;
      }
    }
    if (bestI < 0) break;
    picked.push(candidates[bestI].rgb);
  }

  // Fill remaining with mass-weighted leftovers if needed
  if (picked.length < target) {
    const rest = candidates
      .filter((c) => !picked.some((p) => colorDistanceSq(c.rgb, p) < 25))
      .sort((a, b) => b.mass - a.mass);
    for (const c of rest) {
      if (picked.length >= target) break;
      picked.push(c.rgb);
    }
  }

  return picked.slice(0, target);
}

/** Classic median-cut (kept for Limited / comparison). */
export function medianCut(pixels: RGB[], k: number): RGB[] {
  if (pixels.length === 0) return [];
  type Bucket = { pixels: RGB[] };
  const buckets: Bucket[] = [{ pixels: pixels.slice() }];

  const channelRange = (px: RGB[], ch: 0 | 1 | 2) => {
    let min = 255;
    let max = 0;
    for (const p of px) {
      const v = p[ch];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return max - min;
  };

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
    buckets.splice(
      splitAt,
      1,
      { pixels: bucket.pixels.slice(0, mid) },
      { pixels: bucket.pixels.slice(mid) },
    );
  }

  return buckets.map((b) => {
    let r = 0;
    let g = 0;
    let bl = 0;
    for (const p of b.pixels) {
      r += p[0];
      g += p[1];
      bl += p[2];
    }
    const n = b.pixels.length || 1;
    return [(r / n) | 0, (g / n) | 0, (bl / n) | 0] as RGB;
  });
}

/**
 * Quantize pixels to a palette produced by the chosen mode.
 */
export function quantizePixels(
  pixels: RGB[],
  options: PaletteOptions = {},
): { palette: RGB[]; indices: number[] } {
  const mode = options.mode ?? "auto";
  const k = Math.max(2, Math.min(options.colorCount ?? 16, pixels.length));

  let reduced: RGB[];
  if (mode === "custom" && options.customColors?.length) {
    reduced = options.customColors.slice(0, k);
  } else if (mode === "limited") {
    reduced = medianCut(pixels, k);
  } else {
    // auto (and dmc path uses auto then snaps outside)
    reduced = buildAutoPalette(pixels, k, options.edgeMap);
  }

  const indices = pixels.map((p) => nearestIndexLab(p, reduced));
  return { palette: reduced, indices };
}
