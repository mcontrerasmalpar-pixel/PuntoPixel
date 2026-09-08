/** RGB utilities. Channels are 0–255. */
export type RGB = [number, number, number];

export function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const h =
    (clampByte(r) << 16) | (clampByte(g) << 8) | clampByte(b);
  return "#" + h.toString(16).padStart(6, "0").toUpperCase();
}

/** Relative luminance (sRGB, 0–1). */
export function luminance(r: number, g: number, b: number): number {
  const srgb = [r, g, b].map((c) => {
    const x = c / 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

export function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}
