import type { RGB } from "./rgb";

/** CIE L*a*b* (D65). L ∈ [0,100], a/b roughly [-128,128]. */
export type Lab = [number, number, number];

function srgbToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

/** RGB 0–255 → XYZ (D65). */
function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  // sRGB D65 matrix
  const x = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  const z = R * 0.0193339 + G * 0.119192 + B * 0.9503041;
  return [x, y, z];
}

const XN = 0.95047;
const YN = 1.0;
const ZN = 1.08883;

function fLab(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

/** Convert sRGB (0–255) → CIE L*a*b*. */
export function rgbToLab(r: number, g: number, b: number): Lab {
  const [x, y, z] = rgbToXyz(r, g, b);
  const fx = fLab(x / XN);
  const fy = fLab(y / YN);
  const fz = fLab(z / ZN);
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bb = 200 * (fy - fz);
  return [L, a, bb];
}

export function rgbTupleToLab(rgb: RGB): Lab {
  return rgbToLab(rgb[0], rgb[1], rgb[2]);
}
