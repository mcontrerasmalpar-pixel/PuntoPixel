import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EXAMPLES,
  type Pattern,
  type PreviewKind,
  chartCanvasSize,
  drawChartPreview,
  drawTilePreview,
  imageToPattern,
  loadImageFile,
  printChartHtml,
  renderPatternToCanvas,
  tilePad,
} from "./pattern";

type Lang = "es" | "en";

const COPY = {
  es: {
    bio: "Convierte tus fotos en mosaicos brillantes y gráficos para armar con cuentas.",
    create: "Crear patrón",
    examples: "Ver ejemplos",
    studio: "Estudio",
    upload: "Subir imagen",
    drop: "Arrastra una foto o elige un archivo",
    longSide: "Lado largo",
    colors: "Colores",
    exportPng: "Exportar PNG",
    print: "Imprimir",
    reset: "Reiniciar",
    legend: "Leyenda",
    empty: "Sube una imagen o elige un ejemplo para ver el mosaico.",
    langToggle: "EN",
    preview: "Vista previa",
    tiles: "Azulejos",
    chart: "Gráfico",
    share: "Compartir",
  },
  en: {
    bio: "Turn your photos into glossy tile mosaics and bead charts, ready to make.",
    create: "Create pattern",
    examples: "See examples",
    studio: "Studio",
    upload: "Upload image",
    drop: "Drop a photo or choose a file",
    longSide: "Long side",
    colors: "Colors",
    exportPng: "Export PNG",
    print: "Print",
    reset: "Reset",
    legend: "Legend",
    empty: "Upload an image or pick an example to see the tile mosaic.",
    langToggle: "ES",
    preview: "Preview",
    tiles: "Tiles",
    chart: "Chart",
    share: "Share",
  },
};

const SIZES = [32, 48, 64, 80] as const;
const COLOR_COUNTS = [8, 16, 24, 32] as const;

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
  const [longSide, setLongSide] = useState<(typeof SIZES)[number]>(48);
  const [colorCount, setColorCount] = useState<(typeof COLOR_COUNTS)[number]>(16);
  const [mode, setMode] = useState<PreviewKind>("tiles");
  const [highlight, setHighlight] = useState<number | null>(null);
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const studioRef = useRef<HTMLElement>(null);
  const examplesRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const examples = useMemo(
    () => EXAMPLES.map((e) => ({ ...e, pattern: e.make() })),
    [],
  );

  const recompute = useCallback(
    (img: HTMLImageElement, side: number, colors: number) => {
      setBusy(true);
      setHighlight(null);
      requestAnimationFrame(() => {
        try {
          setPattern(imageToPattern(img, side, colors));
        } finally {
          setBusy(false);
        }
      });
    },
    [],
  );

  useEffect(() => {
    if (!source) return;
    recompute(source, longSide, colorCount);
  }, [source, longSide, colorCount, recompute]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pattern) return;
    const maxW = Math.min(760, canvas.parentElement?.clientWidth || 760);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (mode === "chart") {
      const fitted = Math.floor((maxW - 56) / pattern.width);
      const cell = Math.max(18, fitted);
      const size = chartCanvasSize(pattern, cell);
      canvas.width = size.width;
      canvas.height = size.height;
      drawChartPreview(ctx, pattern, cell, highlight);
    } else {
      const fitted = Math.floor((maxW - 24) / pattern.width);
      const cell = Math.max(8, fitted);
      const pad = tilePad(cell);
      canvas.width = pattern.width * cell + pad * 2;
      canvas.height = pattern.height * cell + pad * 2;
      drawTilePreview(ctx, pattern, cell, highlight);
    }
  }, [pattern, mode, highlight]);

  const goStudio = () => {
    studioRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const onFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const img = await loadImageFile(file);
    setSource(img);
    goStudio();
  };

  const exportPng = () => {
    if (!pattern) return;
    const cell =
      mode === "chart"
        ? Math.max(18, Math.min(24, Math.floor(1400 / pattern.width)))
        : Math.max(10, Math.min(22, Math.floor(1600 / pattern.width)));
    const off = renderPatternToCanvas(pattern, cell, mode, highlight);
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
    setMode("tiles");
    setLongSide(48);
    setColorCount(16);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openExample = (p: Pattern) => {
    setSource(null);
    setPattern(p);
    setHighlight(null);
    goStudio();
  };

  const toggleColor = (i: number) => {
    setHighlight((cur) => (cur === i ? null : i));
  };

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

          <fieldset>
            <legend>{t.longSide}</legend>
            <div className="seg">
              {SIZES.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n === longSide ? "on" : ""}
                  onClick={() => setLongSide(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>{t.colors}</legend>
            <div className="seg">
              {COLOR_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n === colorCount ? "on" : ""}
                  onClick={() => setColorCount(n)}
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
          <div className="preview-wrap">
            {pattern ? (
              <canvas ref={canvasRef} className="preview" aria-label={t.preview} />
            ) : (
              <p className="empty">{t.empty}</p>
            )}
          </div>
        </div>

        {pattern && (
          <div className="swatch-row" role="list">
            {pattern.palette.map((f, i) => (
              <button
                key={f.code + i}
                type="button"
                role="listitem"
                className={`dot ${highlight === i ? "on" : ""}`}
                style={{ background: f.hex }}
                title={`${f.code} · ${f.name} (${pattern.counts[i]})`}
                aria-label={`${f.code} ${f.name}`}
                onClick={() => toggleColor(i)}
              />
            ))}
          </div>
        )}

        {pattern && (
          <div className="legend">
            <h3>{t.legend}</h3>
            <ul>
              {pattern.palette.map((f, i) => (
                <li
                  key={f.code + i}
                  className={highlight === i ? "on" : ""}
                  onClick={() => toggleColor(i)}
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
