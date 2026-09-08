import type { Pattern } from "./pattern_core";
import { paintCell, ensureFloss, setCell } from "./pattern_core";
import type { Floss } from "./palette";

/** Flood-fill connected region (4-connected) with a floss. */
export function fillRegion(
  pattern: Pattern,
  x: number,
  y: number,
  floss: Floss | null,
): Pattern {
  const w = pattern.width;
  const h = pattern.height;
  if (x < 0 || y < 0 || x >= w || y >= h) return pattern;

  const startIdx = y * w + x;
  const target = pattern.cells[startIdx];

  // Resolve destination palette index
  let next = pattern;
  let destIndex: number;
  if (floss == null) {
    // erase → AIDA handled by paintCell path; use paintCell on seed then fill same
    next = paintCell(pattern, x, y, null);
    destIndex = next.cells[startIdx];
  } else {
    const ensured = ensureFloss(pattern, floss);
    next = ensured.pattern;
    destIndex = ensured.index;
  }

  if (target === destIndex) return next;

  const cells = next.cells.slice();
  const counts = next.counts.slice();
  const stack: [number, number][] = [[x, y]];
  const seen = new Set<number>();

  while (stack.length) {
    const [cx, cy] = stack.pop()!;
    const i = cy * w + cx;
    if (seen.has(i)) continue;
    seen.add(i);
    if (cells[i] !== target) continue;

    counts[cells[i]]--;
    cells[i] = destIndex;
    counts[destIndex]++;

    if (cx > 0) stack.push([cx - 1, cy]);
    if (cx < w - 1) stack.push([cx + 1, cy]);
    if (cy > 0) stack.push([cx, cy - 1]);
    if (cy < h - 1) stack.push([cx, cy + 1]);
  }

  return { ...next, cells, counts };
}

/** Eyedropper: return floss at cell, or null if OOB. */
export function pickFlossAt(
  pattern: Pattern,
  x: number,
  y: number,
): Floss | null {
  if (x < 0 || y < 0 || x >= pattern.width || y >= pattern.height) return null;
  return pattern.palette[pattern.cells[y * pattern.width + x]] ?? null;
}

export function applyPencil(
  pattern: Pattern,
  x: number,
  y: number,
  floss: Floss | null,
): Pattern {
  return paintCell(pattern, x, y, floss);
}

/** Simple history stack for undo/redo. */
export class PatternHistory {
  private past: Pattern[] = [];
  private future: Pattern[] = [];
  private current: Pattern | null = null;
  private max = 50;

  reset(p: Pattern | null) {
    this.past = [];
    this.future = [];
    this.current = p;
  }

  push(next: Pattern) {
    if (this.current) {
      this.past.push(this.current);
      if (this.past.length > this.max) this.past.shift();
    }
    this.current = next;
    this.future = [];
  }

  /** Replace current without pushing history (e.g. after external recompute). */
  set(p: Pattern | null) {
    this.current = p;
    this.past = [];
    this.future = [];
  }

  undo(): Pattern | null {
    if (!this.current || this.past.length === 0) return this.current;
    this.future.push(this.current);
    this.current = this.past.pop()!;
    return this.current;
  }

  redo(): Pattern | null {
    if (this.future.length === 0) return this.current;
    if (this.current) this.past.push(this.current);
    this.current = this.future.pop()!;
    return this.current;
  }

  get value() {
    return this.current;
  }

  get canUndo() {
    return this.past.length > 0;
  }

  get canRedo() {
    return this.future.length > 0;
  }
}

export { setCell };
