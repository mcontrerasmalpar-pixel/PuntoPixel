import type { Pattern } from "../pattern_core";
import type { RGB } from "../palette";
import { hexToRgb } from "../palette";

export type CleanupOptions = {
  /** Remove single-pixel islands that differ from all 4-neighbors. Default true. */
  removeSingleNoise?: boolean;
  /** Smooth 1-pixel jogs on otherwise straight edges. Default true. */
  fixBrokenEdges?: boolean;
  /** Drop colors used only once (unless high edge importance). Default true. */
  removeIsolatedColors?: boolean;
  /** Min stitch count to keep a color (default 1 = remove only singles). */
  minColorCount?: number;
};

/**
 * Post-pixelization cleanup so the chart looks intentional, not auto-noisy.
 *
 * 1. Single-pixel noise: center differs from all 4-neighbors → replace with majority neighbor
 * 2. Broken edges: fix single-pixel staircase jogs when 3 of 4 edge-neighbors agree
 * 3. Isolated colors: remap colors with count ≤ minColorCount to nearest remaining floss
 */
export function cleanupPattern(
  pattern: Pattern,
  options: CleanupOptions = {},
): Pattern {
  const {
    removeSingleNoise = true,
    fixBrokenEdges = true,
    removeIsolatedColors = true,
    minColorCount = 1,
  } = options;

  const { width: w, height: h } = pattern;
  let cells = pattern.cells.slice();
  let palette = pattern.palette.slice();
  let counts = pattern.counts.slice();

  const idx = (x: number, y: number) => y * w + x;
  const inBounds = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h;

  const neighbors4 = (x: number, y: number) => {
    const n: number[] = [];
    if (inBounds(x - 1, y)) n.push(cells[idx(x - 1, y)]);
    if (inBounds(x + 1, y)) n.push(cells[idx(x + 1, y)]);
    if (inBounds(x, y - 1)) n.push(cells[idx(x, y - 1)]);
    if (inBounds(x, y + 1)) n.push(cells[idx(x, y + 1)]);
    return n;
  };

  const majority = (vals: number[]): number | null => {
    if (vals.length === 0) return null;
    const map = new Map<number, number>();
    for (const v of vals) map.set(v, (map.get(v) ?? 0) + 1);
    let best = vals[0];
    let bestC = 0;
    for (const [v, c] of map) {
      if (c > bestC) {
        bestC = c;
        best = v;
      }
    }
    return best;
  };

  // --- 1. Single-pixel noise ---
  if (removeSingleNoise) {
    const next = cells.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = idx(x, y);
        const c = cells[i];
        const n = neighbors4(x, y);
        if (n.length < 3) continue;
        // All neighbors different from center and at least 2 agree
        if (n.every((v) => v !== c)) {
          const m = majority(n);
          if (m != null && m !== c) next[i] = m;
        }
      }
    }
    cells = next;
  }

  // --- 2. Broken edges (simple jog fix) ---
  if (fixBrokenEdges) {
    const next = cells.slice();
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = idx(x, y);
        const c = cells[i];
        // Horizontal jog: left and right same, up or down differs → fill
        const L = cells[idx(x - 1, y)];
        const R = cells[idx(x + 1, y)];
        const U = cells[idx(x, y - 1)];
        const D = cells[idx(x, y + 1)];
        if (L === R && L !== c && (U === L || D === L)) {
          // Isolated protrusion on a run
          const same = [L, R, U, D].filter((v) => v === L).length;
          if (same >= 3) next[i] = L;
        } else if (U === D && U !== c && (L === U || R === U)) {
          const same = [L, R, U, D].filter((v) => v === U).length;
          if (same >= 3) next[i] = U;
        }
      }
    }
    cells = next;
  }

  // Recompute counts after geometric cleanup
  counts = new Array(palette.length).fill(0);
  for (const c of cells) counts[c]++;

  // --- 3. Isolated colors ---
  if (removeIsolatedColors) {
    const keep = new Set<number>();
    for (let i = 0; i < palette.length; i++) {
      if (counts[i] > minColorCount) keep.add(i);
    }
    // Always keep at least something
    if (keep.size === 0) {
      let best = 0;
      for (let i = 1; i < counts.length; i++) {
        if (counts[i] > counts[best]) best = i;
      }
      keep.add(best);
    }

    if (keep.size < palette.length) {
      const rgbOf = (i: number): RGB => hexToRgb(palette[i].hex);
      const keptList = [...keep];
      const remap = new Array(palette.length).fill(0);

      for (let i = 0; i < palette.length; i++) {
        if (keep.has(i)) {
          remap[i] = keptList.indexOf(i);
          continue;
        }
        // nearest kept by RGB (floss already perceptual-picked)
        const src = rgbOf(i);
        let bestK = 0;
        let bestD = Infinity;
        for (let k = 0; k < keptList.length; k++) {
          const t = rgbOf(keptList[k]);
          const d =
            (src[0] - t[0]) ** 2 +
            (src[1] - t[1]) ** 2 +
            (src[2] - t[2]) ** 2;
          if (d < bestD) {
            bestD = d;
            bestK = k;
          }
        }
        remap[i] = bestK;
      }

      const newPalette = keptList.map((i) => palette[i]);
      const newCells = cells.map((c) => remap[c]);
      const newCounts = new Array(newPalette.length).fill(0);
      for (const c of newCells) newCounts[c]++;
      palette = newPalette;
      cells = newCells;
      counts = newCounts;
    }
  }

  return { width: w, height: h, cells, palette, counts };
}
