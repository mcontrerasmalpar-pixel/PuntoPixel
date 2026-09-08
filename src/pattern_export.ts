import type { Pattern, PreviewKind } from "./pattern_core";
import { hexToRgb } from "./palette";
import { renderPatternToCanvas } from "./pattern_draw";
import { printChartHtml } from "./pattern_examples";

/** Estimated floss meters: ~0.015 m per cross-stitch (short stitch approx). */
export function estimateFlossMeters(stitches: number): number {
  return Math.round(stitches * 0.015 * 10) / 10;
}

export function patternStats(pattern: Pattern) {
  const stitches = pattern.width * pattern.height;
  const colors = pattern.palette.length;
  const flossM = estimateFlossMeters(stitches);
  return { stitches, colors, flossM };
}

/**
 * Export pure pixel grid at scale× using nearest-neighbor (never bilinear).
 * scale=1 → width×height true pixels; scale=32 → 32× enlargement.
 */
export function exportPixelPng(
  pattern: Pattern,
  scale: number,
): HTMLCanvasElement {
  const s = Math.max(1, Math.round(scale));
  const canvas = document.createElement("canvas");
  canvas.width = pattern.width * s;
  canvas.height = pattern.height * s;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not available");
  ctx.imageSmoothingEnabled = false;

  // Draw 1× then scale up with nearest-neighbor via drawImage smoothing off
  const tiny = document.createElement("canvas");
  tiny.width = pattern.width;
  tiny.height = pattern.height;
  const tctx = tiny.getContext("2d");
  if (!tctx) throw new Error("Canvas 2D not available");
  const img = tctx.createImageData(pattern.width, pattern.height);
  for (let i = 0; i < pattern.cells.length; i++) {
    const f = pattern.palette[pattern.cells[i]];
    const [r, g, b] = hexToRgb(f.hex);
    const o = i * 4;
    img.data[o] = r;
    img.data[o + 1] = g;
    img.data[o + 2] = b;
    img.data[o + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    tiny,
    0,
    0,
    pattern.width,
    pattern.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas;
}

export function downloadCanvasPng(
  canvas: HTMLCanvasElement,
  filename: string,
): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }, "image/png");
}

/** Export glossy tiles or numbered chart preview. */
export function exportPreviewPng(
  pattern: Pattern,
  mode: PreviewKind,
  highlight: number | null = null,
): void {
  const cell =
    mode === "chart"
      ? Math.max(18, Math.min(24, Math.floor(1400 / pattern.width)))
      : Math.max(10, Math.min(22, Math.floor(1600 / pattern.width)));
  const off = renderPatternToCanvas(pattern, cell, mode, highlight);
  downloadCanvasPng(
    off,
    mode === "chart" ? "puntopixel-chart.png" : "puntopixel-tiles.png",
  );
}

/** Open printable pattern sheet (browser print → PDF). */
export function exportPatternPdf(
  pattern: Pattern,
  lang: "es" | "en" = "es",
): void {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(printChartHtml(pattern, "PuntoPixel", lang));
  w.document.close();
  // User can Save as PDF from print dialog
  setTimeout(() => {
    try {
      w.print();
    } catch {
      /* ignore */
    }
  }, 250);
}

/** PNG scale presets for pixel-art export. */
export const PNG_SCALES = [1, 8, 16, 32, 64, 128] as const;
