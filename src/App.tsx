import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Floss } from "./palette";
import { PALETTE } from "./palette";
import {
  EXAMPLES,
  type Pattern,
  type PreviewKind,
  DIM_MAX,
  DIM_MIN,
  chartCanvasSize,
  clampDim,
  createBlankPattern,
  drawChartPreview,
  drawTilePreview,
  hitTestCell,
  imageToPattern,
  loadImageFile,
  paintCell,
  printChartHtml,
  renderPatternToCanvas,
  tilePad,
} from "./pattern";

type Lang = "es" | "en";
type StudioTool = "highlight" | "paint" | "erase";

const COPY = {
  es: {
    bio: "Convierte tus fotos en mosaicos brillantes y gráficos para armar con cuentas.",
    create: "Crear patrón",
    examples: "Ver ejemplos",
    studio: "Estudio",
    upload: "Subir imagen",
    drop: "Arrastra una foto o elige un archivo",
    width: "Ancho",
    height: "Alto",
    colors: "Colores",
    exportPng: "Exportar PNG",
    print: "Imprimir",
    reset: "Reiniciar",
    legend: "Leyenda",
    empty: "Sube una imagen, crea una plantilla vacía o elige un ejemplo.",
    langToggle: "EN",
    preview: "Vista previa",
    tiles: "Azulejos",
    chart: "Gráfico",
    share: "Compartir",
    blank: "Plantilla vacía",
    paint: "Pintar",
    erase: "Borrar",
    highlight: "Resaltar",
    paintHint: "Elige un color y toca las celdas del gráfico o mosaico.",
    eraseHint: "Toca celdas para volver a tela AIDA.",
    paintPalette: "Paleta para pintar",
    cells: "celdas",
  },
  en: {
    bio: "Turn your photos into glossy tile mosaics and bead charts, ready to make.",
    create: "Create pattern",
    examples: "See examples",
    studio: "Studio",
    upload: "Upload image",
    drop: "Drop a photo or choose a file",
    width: "Width",
    height: "Height",
    colors: "Colors",
    exportPng: "Export PNG",
    print: "Print",
    reset: "Reset",
    legend: "Legend",
    empty: "Upload an image, create a blank template, or pick an example.",
    langToggle: "ES",
    preview: "Preview",
    tiles: "Tiles",
    chart: "Chart",
    share: "Share",
    blank: "Blank template",
    paint: "Paint",
    erase: "Erase",
    highlight: "Highlight",
    paintHint: "Pick a color, then tap cells on the chart or tiles.",
    eraseHint: "Tap cells to restore AIDA cloth.",
    paintPalette: "Paint palette",
    cells: "cells",
  },
};

const SIZE_PRESETS = [16, 24, 32, 48, 64, 80] as const;
const COLOR_COUNTS = [8, 16, 24, 32] as const;

/** Curated DMC-like chips for blank painting (still honest palette). */
const PAINT_CODES = [
  "321", "666", "3328", "608", "444", "907", "911", "825",
  "340", "552", "335", "310", "B5200", "414", "433", "738",
] as const;

const PAINT_FLOSS: Floss[] = PAINT_CODES.map((code) => {
  const f = PALETTE.find((p) => p.code === code);
  if (!f) throw new Error(`Missing paint floss ${code}`);
  return f;
});

function Mark({ size = 36 }: { size?: number }) {
  return (
    <svg
      className="mark"
      width={size}
      height={size}
      viewBox="0 0 36 36"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="34" height="34" rx="11" className="mark-bg" />
      <rect x="6" y="6" width="11" height="11" rx="3.2" className="mark-tile a" />
      <rect x="19" y="6" width="11" height="11" rx="3.2" className="mark-tile b" />
      <rect x="6" y="19" width="11" height="11" rx="3.2" className="mark-tile b" />
      <rect x="19" y="19" width="11" height="11" rx="3.2" className="mark-tile c" />
    </svg>
  );
}

function IconTiles() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="2.2" fill="currentColor" />
      <rect x="13" y="3" width="8" height="8" rx="2.2" fill="currentColor" opacity="0.55" />
      <rect x="3" y="13" width="8" height="8" rx="2.2" fill="currentColor" opacity="0.55" />
      <rect x="13" y="13" width="8" height="8" rx="2.2" fill="currentColor" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 10h17M3.5 16h17M10 3.5v17M16 3.5v17" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconShare() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="18" cy="5" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="6" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="18" cy="19" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.2 11.1 15.7 6.4M8.3 13.2l7.4 4.4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function IconPrint() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 9V4h10v5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="6" y="13" width="12" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 9h16v8h-3M7 17H4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function DimField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <fieldset className="dim-field">
      <legend>{label}</legend>
      <div className="dim-controls">
        <div className="seg compact">
          {SIZE_PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              className={n === value ? "on" : ""}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <input
          className="dim-input"
          type="number"
          min={DIM_MIN}
          max={DIM_MAX}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(clampDim(Number(e.target.value)))}
        />
      </div>
    </fieldset>
  );
}

function ExampleTile({
  pattern,
  title,
  onOpen,
}: {
  pattern: Pattern;
  title: string;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const cell = Math.floor(220 / Math.max(pattern.width, pattern.height));
    const pad = tilePad(cell);
    canvas.width = pattern.width * cell + pad * 2;
    canvas.height = pattern.height * cell + pad * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawTilePreview(ctx, pattern, cell, null);
  }, [pattern]);
  return (
    <button type="button" className="example-tile" onClick={onOpen}>
      <canvas ref={ref} />
      <span>{title}</span>
    </button>
  );
}

export default function App() {
  const [lang, setLang] = useState<Lang>("es");
  const t = COPY[lang];
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [width, setWidth] = useState(30);
  const [height, setHeight] = useState(25);
  const [colorCount, setColorCount] = useState<(typeof COLOR_COUNTS)[number]>(16);
  const [mode, setMode] = useState<PreviewKind>("chart");
  const [tool, setTool] = useState<StudioTool>("highlight");
  const [paintFloss, setPaintFloss] = useState<Floss | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cellRef = useRef(18);
  const paintingRef = useRef(false);
  const lastPaintRef = useRef<string | null>(null);
  const studioRef = useRef<HTMLElement>(null);
  const examplesRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const examples = useMemo(
    () => EXAMPLES.map((e) => ({ ...e, pattern: e.make() })),
    [],
  );

  const recompute = useCallback(
    (img: HTMLImageElement, w: number, h: number, colors: number) => {
      setBusy(true);
      setHighlight(null);
      requestAnimationFrame(() => {
        try {
          setPattern(imageToPattern(img, w, h, colors));
        } finally {
          setBusy(false);
        }
      });
    },
    [],
  );

  useEffect(() => {
    if (!source) return;
    recompute(source, width, height, colorCount);
  }, [source, width, height, colorCount, recompute]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pattern) return;
    const maxW = Math.min(760, canvas.parentElement?.clientWidth || 760);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (mode === "chart") {
      const fitted = Math.floor((maxW - 56) / pattern.width);
      const cell = Math.max(18, fitted);
      cellRef.current = cell;
      const size = chartCanvasSize(pattern, cell);
      canvas.width = size.width;
      canvas.height = size.height;
      drawChartPreview(ctx, pattern, cell, tool === "highlight" ? highlight : null);
    } else {
      const fitted = Math.floor((maxW - 24) / pattern.width);
      const cell = Math.max(8, fitted);
      cellRef.current = cell;
      const pad = tilePad(cell);
      canvas.width = pattern.width * cell + pad * 2;
      canvas.height = pattern.height * cell + pad * 2;
      drawTilePreview(ctx, pattern, cell, tool === "highlight" ? highlight : null);
    }
  }, [pattern, mode, highlight, tool]);

  const goStudio = () => {
    studioRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const onFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const img = await loadImageFile(file);
    setSource(img);
    setTool("highlight");
    setPaintFloss(null);
    goStudio();
  };

  const createBlank = () => {
    setSource(null);
    setPattern(createBlankPattern(width, height));
    setHighlight(null);
    setMode("chart");
    setTool("paint");
    setPaintFloss(PAINT_FLOSS[0]);
    if (fileRef.current) fileRef.current.value = "";
    goStudio();
  };

  const exportPng = () => {
    if (!pattern) return;
    const cell =
      mode === "chart"
        ? Math.max(18, Math.min(24, Math.floor(1400 / pattern.width)))
        : Math.max(10, Math.min(22, Math.floor(1600 / pattern.width)));
    const off = renderPatternToCanvas(
      pattern,
      cell,
      mode,
      tool === "highlight" ? highlight : null,
    );
    off.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = mode === "chart" ? "puntopixel-chart.png" : "puntopixel-tiles.png";
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  };

  const openPrint = () => {
    if (!pattern) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(printChartHtml(pattern, "PuntoPixel", lang));
    w.document.close();
  };

  const reset = () => {
    setSource(null);
    setPattern(null);
    setHighlight(null);
    setMode("chart");
    setTool("highlight");
    setPaintFloss(null);
    setWidth(30);
    setHeight(25);
    setColorCount(16);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openExample = (p: Pattern) => {
    setSource(null);
    setPattern(p);
    setHighlight(null);
    setTool("highlight");
    setPaintFloss(null);
    goStudio();
  };

  const selectLegendColor = (i: number) => {
    if (!pattern) return;
    if (tool === "paint") {
      const f = pattern.palette[i];
      setPaintFloss((cur) => (cur && cur.code === f.code ? null : f));
      return;
    }
    if (tool === "erase") {
      setTool("highlight");
    }
    setHighlight((cur) => (cur === i ? null : i));
  };

  const applyPaintAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !pattern) return;
    if (tool !== "paint" && tool !== "erase") return;
    if (tool === "paint" && !paintFloss) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const px = ((clientX - rect.left) / rect.width) * canvas.width;
    const py = ((clientY - rect.top) / rect.height) * canvas.height;
    const hit = hitTestCell(pattern, mode, cellRef.current, px, py);
    if (!hit) return;
    const key = `${hit.x},${hit.y}`;
    if (lastPaintRef.current === key) return;
    lastPaintRef.current = key;
    const floss = tool === "erase" ? null : paintFloss;
    setPattern((prev) => (prev ? paintCell(prev, hit.x, hit.y, floss) : prev));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== "paint" && tool !== "erase") return;
    e.preventDefault();
    paintingRef.current = true;
    lastPaintRef.current = null;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    applyPaintAt(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!paintingRef.current) return;
    e.preventDefault();
    applyPaintAt(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    paintingRef.current = false;
    lastPaintRef.current = null;
    try {
      (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const paintCursor =
    tool === "paint" || tool === "erase" ? "preview paint-cursor" : "preview";

  return (
    <div className="page">
      <header className="top">
        <a
          className="brand"
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <Mark />
          <span>PuntoPixel</span>
        </a>
        <button
          type="button"
          className="lang"
          onClick={() => setLang(lang === "es" ? "en" : "es")}
          aria-label="Language"
        >
          {t.langToggle}
        </button>
      </header>

      <section className="hero" id="top">
        <Mark size={56} />
        <h1>PuntoPixel</h1>
        <p className="bio">{t.bio}</p>
        <div className="cta-row">
          <button type="button" className="btn primary" onClick={goStudio}>
            {t.create}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => examplesRef.current?.scrollIntoView({ behavior: "smooth" })}
          >
            {t.examples}
          </button>
        </div>
      </section>

      <section className="examples" ref={examplesRef} id="ejemplos">
        <div className="example-grid">
          {examples.map((ex) => (
            <ExampleTile
              key={ex.id}
              pattern={ex.pattern}
              title={lang === "es" ? ex.titleEs : ex.titleEn}
              onOpen={() => openExample(ex.pattern)}
            />
          ))}
        </div>
      </section>

      <section className="studio" ref={studioRef} id="estudio">
        <h2>{t.studio}</h2>
        <div className="controls">
          <label className="upload">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <span className="btn primary">{t.upload}</span>
            <span className="hint">{t.drop}</span>
          </label>

          <button type="button" className="btn ghost blank-btn" onClick={createBlank}>
            {t.blank}
          </button>

          <DimField label={t.width} value={width} onChange={setWidth} />
          <DimField label={t.height} value={height} onChange={setHeight} />

          <fieldset>
            <legend>{t.colors}</legend>
            <div className="seg">
              {COLOR_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n === colorCount ? "on" : ""}
                  onClick={() => setColorCount(n)}
                  disabled={!source}
                  title={!source ? t.blank : undefined}
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className={`preview-stage ${busy ? "busy" : ""}`}>
          <div className="preview-tools">
            <button
              type="button"
              className={`icon-btn ${mode === "tiles" ? "on" : ""}`}
              onClick={() => setMode("tiles")}
              title={t.tiles}
              aria-label={t.tiles}
            >
              <IconTiles />
            </button>
            <button
              type="button"
              className={`icon-btn ${mode === "chart" ? "on" : ""}`}
              onClick={() => setMode("chart")}
              title={t.chart}
              aria-label={t.chart}
            >
              <IconGrid />
            </button>
            <button
              type="button"
              className={`tool-btn ${tool === "highlight" ? "on" : ""}`}
              disabled={!pattern}
              onClick={() => {
                setTool("highlight");
                setPaintFloss(null);
              }}
              title={t.highlight}
            >
              {t.highlight}
            </button>
            <button
              type="button"
              className={`tool-btn ${tool === "paint" ? "on" : ""}`}
              disabled={!pattern}
              onClick={() => {
                setTool("paint");
                setHighlight(null);
                setPaintFloss((cur) => cur ?? PAINT_FLOSS[0]);
              }}
              title={t.paint}
            >
              {t.paint}
            </button>
            <button
              type="button"
              className={`tool-btn ${tool === "erase" ? "on" : ""}`}
              disabled={!pattern}
              onClick={() => {
                setTool("erase");
                setHighlight(null);
                setPaintFloss(null);
              }}
              title={t.erase}
            >
              {t.erase}
            </button>
            <button
              type="button"
              className="icon-btn"
              disabled={!pattern}
              onClick={exportPng}
              title={t.share}
              aria-label={t.share}
            >
              <IconShare />
            </button>
            <button
              type="button"
              className="icon-btn"
              disabled={!pattern}
              onClick={openPrint}
              title={t.print}
              aria-label={t.print}
            >
              <IconPrint />
            </button>
          </div>
          {(tool === "paint" || tool === "erase") && pattern && (
            <p className="tool-hint">{tool === "erase" ? t.eraseHint : t.paintHint}</p>
          )}
          <div className="preview-wrap">
            {pattern ? (
              <canvas
                ref={canvasRef}
                className={paintCursor}
                aria-label={t.preview}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
            ) : (
              <p className="empty">{t.empty}</p>
            )}
          </div>
        </div>

        {pattern && tool === "paint" && (
          <div className="paint-palette">
            <h3>{t.paintPalette}</h3>
            <div className="swatch-row" role="list">
              {PAINT_FLOSS.map((f) => (
                <button
                  key={f.code}
                  type="button"
                  role="listitem"
                  className={`dot ${paintFloss?.code === f.code ? "on" : ""}`}
                  style={{ background: f.hex }}
                  title={`${f.code} · ${f.name}`}
                  aria-label={`${f.code} ${f.name}`}
                  onClick={() =>
                    setPaintFloss((cur) => (cur && cur.code === f.code ? null : f))
                  }
                />
              ))}
            </div>
          </div>
        )}

        {pattern && (
          <div className="swatch-row" role="list">
            {pattern.palette.map((f, i) => (
              <button
                key={f.code + i}
                type="button"
                role="listitem"
                className={`dot ${
                  tool === "paint"
                    ? paintFloss?.code === f.code
                      ? "on"
                      : ""
                    : highlight === i
                      ? "on"
                      : ""
                }`}
                style={{ background: f.hex }}
                title={`${f.code} · ${f.name} (${pattern.counts[i]})`}
                aria-label={`${f.code} ${f.name}`}
                onClick={() => selectLegendColor(i)}
              />
            ))}
          </div>
        )}

        {pattern && (
          <div className="legend">
            <h3>
              {t.legend}{" "}
              <span className="legend-meta">
                {pattern.width}×{pattern.height} · {pattern.width * pattern.height}{" "}
                {t.cells}
              </span>
            </h3>
            <ul>
              {pattern.palette.map((f, i) => (
                <li
                  key={f.code + i}
                  className={
                    tool === "paint"
                      ? paintFloss?.code === f.code
                        ? "on"
                        : ""
                      : highlight === i
                        ? "on"
                        : ""
                  }
                  onClick={() => selectLegendColor(i)}
                >
                  <span className="code">{f.code}</span>
                  <span className="swatch" style={{ background: f.hex }} />
                  <span className="name">{f.name}</span>
                  <span className="count">{pattern.counts[i]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="actions">
          <button type="button" className="btn ghost" onClick={reset}>
            {t.reset}
          </button>
        </div>
      </section>

      <footer>
        <Mark size={22} />
        <span>PuntoPixel · MIT · Maria Contreras 2026</span>
      </footer>
    </div>
  );
}
