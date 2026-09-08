import type { RGB } from "./rgb";
import { rgbToLab, type Lab } from "./lab";

/**
 * CIE76 ΔE — Euclidean distance in Lab.
 * Good perceptual proxy; much better than RGB Euclidean for DMC matching.
 * (CIEDE2000 is more accurate but heavier; we can upgrade later.)
 */
export function deltaE76(a: Lab, b: Lab): number {
  const dL = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

/** Squared ΔE76 (avoids sqrt when only comparing). */
export function deltaE76Sq(a: Lab, b: Lab): number {
  const dL = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return dL * dL + da * da + db * db;
}

/**
 * Perceptual color distance between two RGB colors.
 * Returns CIE76 ΔE (≈0 = identical, ≈2.3 = just noticeable).
 */
export function colorDistance(a: RGB, b: RGB): number {
  return deltaE76(rgbToLab(a[0], a[1], a[2]), rgbToLab(b[0], b[1], b[2]));
}

export function colorDistanceSq(a: RGB, b: RGB): number {
  return deltaE76Sq(rgbToLab(a[0], a[1], a[2]), rgbToLab(b[0], b[1], b[2]));
}

/** Index of nearest palette entry under ΔE. */
export function nearestIndexLab(color: RGB, palette: RGB[]): number {
  const lab = rgbToLab(color[0], color[1], color[2]);
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    const d = deltaE76Sq(lab, rgbToLab(p[0], p[1], p[2]));
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export type { Lab };
