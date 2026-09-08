import type { RGB } from "../color/rgb";
import { luminance } from "../color/rgb";

/**
 * Sobel edge importance map for a flat RGB pixel buffer.
 * Returns Float32Array of length w*h with values in [0, 1]
 * (higher = stronger edge / silhouette).
 */
export function edgeImportanceMap(
  pixels: RGB[],
  width: number,
  height: number,
): Float32Array {
  const n = width * height;
  const gray = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const [r, g, b] = pixels[i];
    gray[i] = luminance(r, g, b);
  }

  const gxK = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gyK = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  const mag = new Float32Array(n);
  let maxM = 1e-6;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;
      let k = 0;
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const v = gray[(y + j) * width + (x + i)];
          gx += v * gxK[k];
          gy += v * gyK[k];
          k++;
        }
      }
      const m = Math.sqrt(gx * gx + gy * gy);
      mag[y * width + x] = m;
      if (m > maxM) maxM = m;
    }
  }

  // Normalize + mild local contrast boost on borders
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = mag[i] / maxM;
  }
  return out;
}

/**
 * Weight for a pixel when averaging / quantizing:
 * edge pixels get higher weight so silhouettes survive downsampling.
 */
export function edgeWeight(importance: number, strength = 2): number {
  // 1 + strength * importance → edges count more in averages
  return 1 + strength * importance;
}
