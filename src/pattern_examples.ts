import {
  type Floss,
  hexToRgb,
  nearestFloss,
} from "./palette";
import {
  type Pattern,
  AIDA,
} from "./pattern_core";
import { isUnusedFloss } from "./pattern_draw";

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
