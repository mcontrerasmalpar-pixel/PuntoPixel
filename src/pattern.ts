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

export const AIDA = "#F3E6C9";
export const AIDA_RGB: RGB = [243, 230, 201];

const SYMBOLS = [
  "×", "+", "○", "●", "▲", "△", "■", "□", "★", "☆", "◆", "◇",
  "▼", "▽", "✦", "❖", "✚", "✱", "*", "#", "@", "%", "&", "=",
  "~", "^", "z", "s", "v", "w", "n", "m",
];

export function symbolFor(index: number): string {
  return SYMBOLS[index % SYMBOLS.length];
}

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

export function sampleImage(
  img: HTMLImageElement | HTMLCanvasElement,
  longSide: number,
): { width: number; height: number; pixels: RGB[] } {
  const iw =
    "naturalWidth" in img && img.naturalWidth
      ? img.naturalWidth
      : (img as HTMLCanvasElement).width;
  const ih =
    "naturalHeight" in img && img.naturalHeight
      ? img.naturalHeight
      : (img as HTMLCanvasElement).height;
  const scale = longSide / Math.max(iw, ih);
  const width = Math.max(1, Math.round(iw * scale));
  const height = Math.max(1, Math.round(ih * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D not available");
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;
  const pixels: RGB[] = new Array(width * height);
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
  return { width, height, pixels };
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
  longSide: number,
  colorCount: number,
): Pattern {
  const { width, height, pixels } = sampleImage(img, longSide);
  return pixelsToPattern(width, height, pixels, colorCount);
}

export function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };
    img.src = url;
  });
}

function darken(hex: string, amount = 0.35): string {
  const [r, g, b] = hexToRgb(hex);
  const f = 1 - amount;
  return `rgb(${(r * f) | 0},${(g * f) | 0},${(b * f) | 0})`;
}

export function drawStitchPreview(
  ctx: CanvasRenderingContext2D,
  pattern: Pattern,
  cell: number,
  outline: boolean,
): void {
  const { width, height, cells, palette } = pattern;
  ctx.fillStyle = AIDA;
  ctx.fillRect(0, 0, width * cell, height * cell);

  ctx.strokeStyle = "rgba(180, 150, 110, 0.18)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cell + 0.5, 0);
    ctx.lineTo(x * cell + 0.5, height * cell);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * cell + 0.5);
    ctx.lineTo(width * cell, y * cell + 0.5);
    ctx.stroke();
  }

  const pad = Math.max(1.4, cell * 0.22);
  const lw = Math.max(1.2, cell * 0.22);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const floss = palette[cells[i]];
      const px = x * cell;
      const py = y * cell;
      ctx.strokeStyle = floss.hex;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(px + pad, py + pad);
      ctx.lineTo(px + cell - pad, py + cell - pad);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px + cell - pad, py + pad);
      ctx.lineTo(px + pad, py + cell - pad);
      ctx.stroke();
      ctx.fillStyle = floss.hex;
      ctx.beginPath();
      ctx.arc(px + cell / 2, py + cell / 2, Math.max(0.6, cell * 0.07), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (outline) {
    ctx.lineCap = "butt";
    ctx.lineWidth = Math.max(1, cell * 0.08);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const c = cells[i];
        const rgb = flossRgb(palette[c]);
        const neighbors: [number, number, number, number][] = [
          [x + 1, y, x + 1, y],
          [x - 1, y, x, y],
          [x, y + 1, x, y + 1],
          [x, y - 1, x, y],
        ];
        for (const [nx, ny, ex, ey] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (cells[ni] === c) continue;
          const nrgb = flossRgb(palette[cells[ni]]);
          if (Math.abs(luminance(rgb) - luminance(nrgb)) < 48) continue;
          ctx.strokeStyle = darken(palette[c].hex, 0.45);
          ctx.beginPath();
          if (nx !== x) {
            ctx.moveTo(ex * cell, y * cell);
            ctx.lineTo(ex * cell, (y + 1) * cell);
          } else {
            ctx.moveTo(x * cell, ey * cell);
            ctx.lineTo((x + 1) * cell, ey * cell);
          }
          ctx.stroke();
        }
      }
    }
  }
}

export function renderPatternToCanvas(
  pattern: Pattern,
  cell: number,
  outline: boolean,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = pattern.width * cell;
  canvas.height = pattern.height * cell;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not available");
  drawStitchPreview(ctx, pattern, cell, outline);
  return canvas;
}

function patternFromBitmap(rows: string[], colors: Record<string, string>): Pattern {
  const height = rows.length;
  const width = rows[0].length;
  const used: Floss[] = [];
  const keyToIndex = new Map<string, number>();
  const cells: number[] = [];
  for (const row of rows) {
    for (let x = 0; x < width; x++) {
      const ch = row[x] ?? ".";
      const hex = colors[ch] ?? AIDA;
      let idx = keyToIndex.get(ch);
      if (idx === undefined) {
        const [r, g, b] = hexToRgb(hex);
        const f = nearestFloss(r, g, b);
        idx = used.findIndex((u) => u.code === f.code);
        if (idx === -1) {
          idx = used.length;
          used.push(f);
        }
        keyToIndex.set(ch, idx);
      }
      cells.push(idx);
    }
  }
  const counts = new Array(used.length).fill(0);
  for (const c of cells) counts[c]++;
  return { width, height, cells, palette: used, counts };
}

/** Hand-drawn 24x24 pixel-art demos (not photos). */
export function exampleHeart(): Pattern {
  const rows = [
    "........................",
    "........................",
    "......rrr......rrr......",
    "....rrRRRr....rRRRrr....",
    "...rRRRRRRr..rRRRRRRr...",
    "...rRRRRRRRrrRRRRRRRr...",
    "..rRRRRRRRRRRRRRRRRRRr..",
    "..rRRRRRRRRRRRRRRRRRRr..",
    "..rRRRRRRRRRRRRRRRRRRr..",
    "...rRRRRRRRRRRRRRRRRr...",
    "...rRRRRRRRRRRRRRRRRr...",
    "....rRRRRRRRRRRRRRRr....",
    ".....rRRRRRRRRRRRRr.....",
    "......rRRRRRRRRRRr......",
    ".......rRRRRRRRRr.......",
    "........rRRRRRRr........",
    ".........rRRRRr.........",
    "..........rRRr..........",
    "...........rr...........",
    "........................",
    "........................",
    "........................",
    "........................",
    "........................",
  ];
  return patternFromBitmap(rows, {
    ".": AIDA,
    r: "#E36D6D",
    R: "#C72C3B",
  });
}

export function exampleFlower(): Pattern {
  const rows = [
    "........................",
    "..........yyyy..........",
    "........yyYYYYyy........",
    ".......yYYYYYYYYy.......",
    "......pp..YYYY..pp......",
    ".....pPPp.YYYY.pPPp.....",
    "....pPPPPpyYYypPPPPp....",
    "....pPPPPPpyypPPPPPp....",
    ".....pPPPPpyypPPPPp.....",
    "......pPPp.yy.pPPp......",
    ".......pp..gg..pp.......",
    "...........gg...........",
    "..........gGGg..........",
    ".........gGGGgg.........",
    "........ggGGGg.g........",
    ".......g..gGGg..g.......",
    "......g...gGGg...g......",
    "..........gGGg..........",
    "..........gGGg..........",
    "..........gGGg..........",
    "..........gGGg..........",
    "...........gg...........",
    "........................",
    "........................",
  ];
  return patternFromBitmap(rows, {
    ".": AIDA,
    y: "#FFE793",
    Y: "#FFD600",
    p: "#F0A0A8",
    P: "#DB6A7B",
    g: "#6EC49A",
    G: "#189058",
  });
}

export function exampleBird(): Pattern {
  const rows = [
    "........................",
    "........................",
    ".........bbbb...........",
    ".......bbBBBBbb.........",
    "......bBBBBBBBBb........",
    ".....bBBBBBBBBBBb.oo....",
    ".....bBBBBwBBBBBboo.....",
    "....bBBBBBBB.k.BBb......",
    "....bBBBBBBBBBBBBb......",
    ".....bBBBBBBBBBBb.......",
    ".....ccBBBBBBBBb........",
    "....cccBBBBBBBb.........",
    "...ccccBBBBBbb..........",
    "...cccccBBBbb...........",
    "....cccccbb...gg........",
    ".....ccc......gG........",
    "..............gG........",
    ".............gGGg.......",
    "............gGGGGg......",
    "...........gggGGggg.....",
    "........................",
    "........................",
    "........................",
    "........................",
  ];
  return patternFromBitmap(rows, {
    ".": AIDA,
    b: "#6B9FD4",
    B: "#3477B5",
    w: "#FFFFFF",
    k: "#000000",
    o: "#F27842",
    c: "#E4C7A1",
    g: "#6EC49A",
    G: "#189058",
  });
}

export const EXAMPLES: { id: string; titleEs: string; titleEn: string; make: () => Pattern }[] = [
  { id: "heart", titleEs: "Corazón", titleEn: "Heart", make: exampleHeart },
  { id: "flower", titleEs: "Flor", titleEn: "Flower", make: exampleFlower },
  { id: "bird", titleEs: "Pájaro", titleEn: "Bird", make: exampleBird },
];

export function printChartHtml(pattern: Pattern, title: string): string {
  const { width, height, cells, palette, counts } = pattern;
  const cellPx = Math.max(10, Math.min(16, Math.floor(640 / width)));
  let grid = "";
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = cells[y * width + x];
      const f = palette[i];
      const sym = symbolFor(i);
      grid += `<div class="c" style="color:${f.hex}" title="${f.code}">${sym}</div>`;
    }
  }
  const legend = palette
    .map(
      (f, i) =>
        `<tr><td class="sw" style="background:${f.hex}"></td><td class="sym">${symbolFor(i)}</td><td>DMC ${f.code}</td><td>${f.name}</td><td>${counts[i]}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>${title}</title>
<style>
  @page { size: auto; margin: 12mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #2c241c; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  .meta { color: #6b5e50; font-size: 12px; margin-bottom: 16px; }
  .grid { display: grid; grid-template-columns: repeat(${width}, ${cellPx}px); width: ${width * cellPx}px; border: 1px solid #cbb89a; }
  .c { width: ${cellPx}px; height: ${cellPx}px; box-sizing: border-box; border: 0.4px solid #e2d3b8; display: flex; align-items: center; justify-content: center; font-size: ${Math.max(8, cellPx - 4)}px; line-height: 1; }
  table { border-collapse: collapse; margin-top: 18px; font-size: 13px; }
  td, th { border-bottom: 1px solid #eadfcd; padding: 6px 10px; text-align: left; }
  .sw { width: 22px; height: 14px; border: 1px solid #cbb89a; }
  .sym { font-size: 16px; width: 28px; text-align: center; }
  @media print { button { display: none; } }
</style></head>
<body>
  <button onclick="window.print()">Print</button>
  <h1>${title}</h1>
  <div class="meta">${width} × ${height} · ${palette.length} colors · PuntoPixel</div>
  <div class="grid">${grid}</div>
  <table>
    <thead><tr><th></th><th></th><th>Code</th><th>Name</th><th>Stitches</th></tr></thead>
    <tbody>${legend}</tbody>
  </table>
</body></html>`;
}
