import {
  type Floss,
  type RGB,
  flossRgb,
  hexToRgb,
  nearestFloss,
} from "./palette";
import {
  type Pattern,
  type PreviewKind,
  AIDA,
  AIDA_RGB,
  PAPER_PINK,
} from "./pattern_core";

const UNUSED_GRAY = "#B9B9B9";
const GUIDE = "#E07A4A";
function dist2(a: RGB, b: RGB): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}
function luminance(c: RGB): number {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export type CellHit = { x: number; y: number };

/** Map canvas bitmap coords → cell, accounting for chart gutter / tile pad. */
export function hitTestCell(
  pattern: Pattern,
  mode: PreviewKind,
  cell: number,
  px: number,
  py: number,
): CellHit | null {
  if (mode === "chart") {
    const c = Math.max(18, cell);
    const gutter = chartGutter(c);
    const x = Math.floor((px - gutter) / c);
    const y = Math.floor((py - gutter) / c);
    if (x < 0 || y < 0 || x >= pattern.width || y >= pattern.height) return null;
    return { x, y };
  }
  const pad = tilePad(cell);
  const x = Math.floor((px - pad) / cell);
  const y = Math.floor((py - pad) / cell);
  if (x < 0 || y < 0 || x >= pattern.width || y >= pattern.height) return null;
  return { x, y };
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

export function isUnusedFloss(f: Floss): boolean {
  return dist2(flossRgb(f), AIDA_RGB) < 38 * 38;
}

export function contrastInk(hex: string): string {
  return luminance(hexToRgb(hex)) > 152 ? "#1c1917" : "#ffffff";
}

function shade(rgb: RGB, amt: number): string {
  const t = (v: number) => {
    if (amt >= 0) return Math.min(255, Math.round(v + (255 - v) * amt));
    return Math.max(0, Math.round(v * (1 + amt)));
  };
  return `rgb(${t(rgb[0])},${t(rgb[1])},${t(rgb[2])})`;
}

function pathRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.max(0.5, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawGlossyTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  hex: string,
): void {
  const rgb = hexToRgb(hex);
  const r = Math.max(2, size * 0.22);
  const light = shade(rgb, 0.42);
  const mid = hex;
  const dark = shade(rgb, -0.28);

  ctx.save();
  pathRoundRect(ctx, x, y, size, size, r);
  ctx.shadowColor = "rgba(70, 30, 24, 0.22)";
  ctx.shadowBlur = Math.max(1.2, size * 0.1);
  ctx.shadowOffsetX = size * 0.04;
  ctx.shadowOffsetY = size * 0.07;
  const body = ctx.createLinearGradient(x, y, x + size, y + size);
  body.addColorStop(0, light);
  body.addColorStop(0.42, mid);
  body.addColorStop(1, dark);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.restore();

  ctx.save();
  pathRoundRect(ctx, x, y, size, size, r);
  ctx.clip();
  const hi = ctx.createLinearGradient(x, y, x + size * 0.78, y + size * 0.78);
  hi.addColorStop(0, "rgba(255,255,255,0.62)");
  hi.addColorStop(0.28, "rgba(255,255,255,0.18)");
  hi.addColorStop(0.52, "rgba(255,255,255,0)");
  ctx.fillStyle = hi;
  ctx.fillRect(x, y, size, size);

  const sh = ctx.createLinearGradient(x + size * 0.15, y + size * 0.35, x + size, y + size);
  sh.addColorStop(0, "rgba(0,0,0,0)");
  sh.addColorStop(1, "rgba(0,0,0,0.26)");
  ctx.fillStyle = sh;
  ctx.fillRect(x, y, size, size);

  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = Math.max(1, size * 0.06);
  ctx.beginPath();
  ctx.moveTo(x + r * 0.7, y + size * 0.1);
  ctx.lineTo(x + size * 0.62, y + size * 0.1);
  ctx.stroke();
  ctx.restore();
}

export function tilePad(cell: number): number {
  return Math.max(3, Math.round(cell * 0.1));
}

export function drawTilePreview(
  ctx: CanvasRenderingContext2D,
  pattern: Pattern,
  cell: number,
  highlightIndex: number | null = null,
): void {
  const { width, height, cells, palette } = pattern;
  const pad = tilePad(cell);
  const gap = Math.max(1, cell * 0.08);
  const tile = Math.max(2, cell - gap);
  ctx.fillStyle = PAPER_PINK;
  ctx.fillRect(0, 0, width * cell + pad * 2, height * cell + pad * 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const idx = cells[i];
      const dim = highlightIndex != null && idx !== highlightIndex;
      ctx.save();
      if (dim) ctx.globalAlpha = 0.22;
      const px = pad + x * cell + gap / 2;
      const py = pad + y * cell + gap / 2;
      drawGlossyTile(ctx, px, py, tile, palette[idx].hex);
      ctx.restore();
    }
  }
}

export function chartGutter(cell: number): number {
  return Math.max(22, Math.round(cell * 1.2));
}

export function chartCanvasSize(
  pattern: Pattern,
  cell: number,
): { width: number; height: number; gutter: number } {
  const gutter = chartGutter(cell);
  return {
    gutter,
    width: gutter * 2 + pattern.width * cell,
    height: gutter * 2 + pattern.height * cell,
  };
}

export function drawChartPreview(
  ctx: CanvasRenderingContext2D,
  pattern: Pattern,
  cell: number,
  highlightIndex: number | null = null,
): void {
  const { width, height, cells, palette } = pattern;
  const { gutter, width: cw, height: ch } = chartCanvasSize(pattern, cell);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cw, ch);

  const ox = gutter;
  const oy = gutter;
  const gridW = width * cell;
  const gridH = height * cell;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const idx = cells[i];
      const floss = palette[idx];
      const unused = isUnusedFloss(floss);
      const fill = unused ? UNUSED_GRAY : floss.hex;
      const dim = highlightIndex != null && idx !== highlightIndex;
      ctx.globalAlpha = dim ? 0.2 : 1;
      ctx.fillStyle = fill;
      ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
      if (!unused) {
        const code = floss.code;
        const fontSize = Math.max(
          7,
          Math.min(cell * 0.42, (cell - 3) / Math.max(2.2, code.length * 0.62)),
        );
        ctx.font = `700 ${fontSize}px "Nunito", "Segoe UI", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = contrastInk(fill);
        ctx.fillText(code, ox + x * cell + cell / 2, oy + y * cell + cell / 2 + 0.4);
      }
      ctx.globalAlpha = 1;
    }
  }

  ctx.strokeStyle = "#d4d0cc";
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x++) {
    ctx.beginPath();
    ctx.moveTo(ox + x * cell + 0.5, oy);
    ctx.lineTo(ox + x * cell + 0.5, oy + gridH);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y++) {
    ctx.beginPath();
    ctx.moveTo(ox, oy + y * cell + 0.5);
    ctx.lineTo(ox + gridW, oy + y * cell + 0.5);
    ctx.stroke();
  }

  ctx.strokeStyle = GUIDE;
  ctx.lineWidth = Math.max(2, cell * 0.1);
  ctx.lineCap = "butt";
  for (let x = 10; x < width; x += 10) {
    ctx.beginPath();
    ctx.moveTo(ox + x * cell, oy);
    ctx.lineTo(ox + x * cell, oy + gridH);
    ctx.stroke();
  }
  for (let y = 10; y < height; y += 10) {
    ctx.beginPath();
    ctx.moveTo(ox, oy + y * cell);
    ctx.lineTo(ox + gridW, oy + y * cell);
    ctx.stroke();
  }
  ctx.strokeStyle = "#c9c4bf";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ox + 0.5, oy + 0.5, gridW - 1, gridH - 1);

  ctx.fillStyle = "#6b645e";
  ctx.font = `700 ${Math.max(9, Math.min(12, cell * 0.5))}px "Nunito", "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let x = 0; x < width; x++) {
    const label = String(x + 1);
    const cx = ox + x * cell + cell / 2;
    ctx.fillText(label, cx, oy - gutter / 2);
    ctx.fillText(label, cx, oy + gridH + gutter / 2);
  }
  for (let y = 0; y < height; y++) {
    const label = String(y + 1);
    const cy = oy + y * cell + cell / 2;
    ctx.textAlign = "right";
    ctx.fillText(label, ox - 6, cy);
    ctx.textAlign = "left";
    ctx.fillText(label, ox + gridW + 6, cy);
  }
}

export function renderPatternToCanvas(
  pattern: Pattern,
  cell: number,
  mode: PreviewKind = "tiles",
  highlightIndex: number | null = null,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not available");
  if (mode === "chart") {
    const size = chartCanvasSize(pattern, Math.max(18, cell));
    canvas.width = size.width;
    canvas.height = size.height;
    drawChartPreview(ctx, pattern, Math.max(18, cell), highlightIndex);
  } else {
    const pad = tilePad(cell);
    canvas.width = pattern.width * cell + pad * 2;
    canvas.height = pattern.height * cell + pad * 2;
    drawTilePreview(ctx, pattern, cell, highlightIndex);
  }
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

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function printChartHtml(
  pattern: Pattern,
  title: string,
  lang: "es" | "en" = "es",
): string {
  const { width, height, cells, palette, counts } = pattern;
  const labels =
    lang === "es"
      ? { color: "Color", swatch: "Muestra", beads: "Cuentas", table: "Colores" }
      : { color: "Color", swatch: "Swatch", beads: "Beads", table: "Colors" };
  const cellPx = Math.max(10, Math.min(18, Math.floor(520 / width)));
  const bead = Math.max(7, cellPx - 4);

  let head = `<div class="num"></div>`;
  for (let x = 0; x < width; x++) head += `<div class="num">${x + 1}</div>`;

  let body = "";
  for (let y = 0; y < height; y++) {
    body += `<div class="num">${y + 1}</div>`;
    for (let x = 0; x < width; x++) {
      const i = cells[y * width + x];
      const f = palette[i];
      if (isUnusedFloss(f)) {
        body += `<div class="cell"></div>`;
      } else {
        body += `<div class="cell"><span class="bead" style="background:${f.hex}"></span></div>`;
      }
    }
  }

  const legend = palette
    .map((f, i) => {
      if (isUnusedFloss(f)) return "";
      return `<tr>
        <td>${esc(f.name)}</td>
        <td class="sw-cell"><span class="sw" style="background:${f.hex}"></span></td>
        <td class="n">${counts[i]}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Nunito", "Segoe UI", sans-serif;
    color: #3a322e;
    background: #fff;
  }
  .sheet { max-width: 190mm; margin: 0 auto; padding: 8mm 4mm; text-align: center; }
  .pill {
    display: inline-block;
    background: #e89286;
    color: #fff;
    border-radius: 999px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .title { font-size: 18px; padding: 10px 28px; margin: 0 0 8px; }
  .size { font-size: 13px; padding: 6px 18px; margin: 0 0 16px; background: #f0a89e; }
  .chart {
    display: inline-grid;
    grid-template-columns: 22px repeat(${width}, ${cellPx}px);
    border: 1px solid #e4ddd6;
    background: #fff;
    margin: 0 auto 18px;
  }
  .num {
    font-size: 8px;
    color: #7a736c;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
  }
  .cell {
    width: ${cellPx}px;
    height: ${cellPx}px;
    border: 0.4px solid #ece7e2;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .bead {
    width: ${bead}px;
    height: ${bead}px;
    border-radius: 50%;
    display: block;
    box-shadow: inset 0 1px 1px rgba(255,255,255,0.45), 0 0.5px 0.5px rgba(0,0,0,0.12);
  }
  .table-wrap { display: inline-block; text-align: left; min-width: 260px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th, td { border: 1px solid #e6dfd8; padding: 7px 12px; }
  th { background: #e89286; color: #fff; font-weight: 800; letter-spacing: 0.04em; }
  tr:nth-child(even) td { background: #faf7f4; }
  .sw-cell, .n { text-align: center; }
  .sw {
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid rgba(0,0,0,0.08);
    vertical-align: middle;
  }
  button.print {
    appearance: none;
    border: 0;
    background: #e89286;
    color: #fff;
    font: inherit;
    font-weight: 800;
    border-radius: 999px;
    padding: 8px 18px;
    margin-bottom: 12px;
    cursor: pointer;
  }
  @media print {
    button.print { display: none; }
    .sheet { padding: 0; }
  }
</style></head>
<body>
  <div class="sheet">
    <button class="print" onclick="window.print()">Print</button>
    <div><span class="pill title">${esc(title)}</span></div>
    <div><span class="pill size">${width} x ${height}</span></div>
    <div class="chart">${head}${body}</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>${labels.color}</th><th>${labels.swatch}</th><th>${labels.beads}</th></tr></thead>
        <tbody>${legend}</tbody>
      </table>
    </div>
  </div>
</body></html>`;
}
