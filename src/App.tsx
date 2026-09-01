import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EXAMPLES,
  type Pattern,
  drawStitchPreview,
  imageToPattern,
  loadImageFile,
  printChartHtml,
  renderPatternToCanvas,
  symbolFor,
} from "./pattern";

type Lang = "es" | "en";

const COPY = {
  es: {
    bio: "Convierte tus fotos en patrones de punto de cruz, listos para bordar.",
    create: "Crear patrón",
    examples: "Ver ejemplos",
    studio: "Estudio",
    upload: "Subir imagen",
    drop: "Arrastra una foto o elige un archivo",
    longSide: "Lado largo",
    colors: "Colores",
    outline: "Contorno",
    exportPng: "Exportar PNG",
    print: "Gráfico para imprimir",
    reset: "Reiniciar",
    legend: "Leyenda",
    stitches: "puntadas",
    empty: "Sube una imagen o elige un ejemplo para ver el punto en cruz.",
    langToggle: "EN",
    stitchesUnit: "puntadas",
    dmc: "DMC",
    preview: "Vista previa",
  },
  en: {
    bio: "Turn your photos into friendly cross-stitch charts, ready to stitch.",
    create: "Create pattern",
    examples: "See examples",
    studio: "Studio",
    upload: "Upload image",
    drop: "Drop a photo or choose a file",
    longSide: "Long side",
    colors: "Colors",
    outline: "Outline",
    exportPng: "Export PNG",
    print: "Printable chart",
    reset: "Reset",
    legend: "Legend",
    stitches: "stitches",
    empty: "Upload an image or pick an example to see the cross-stitch preview.",
    langToggle: "ES",
    stitchesUnit: "stitches",
    dmc: "DMC",
    preview: "Preview",
  },
};

const SIZES = [32, 48, 64, 80] as const;
const COLOR_COUNTS = [8, 16, 24, 32] as const;

function Mark({ size = 36 }: { size?: number }) {
  const s = size;
  const pad = s * 0.28;
  return (
    <svg
      className="mark"
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      aria-hidden="true"
    >
      <rect x="1" y="1" width={s - 2} height={s - 2} rx="10" className="mark-bg" />
      <line x1={pad} y1={pad} x2={s - pad} y2={s - pad} className="mark-x" />
      <line x1={s - pad} y1={pad} x2={pad} y2={s - pad} className="mark-x" />
      <circle cx={s / 2} cy={s / 2} r={s * 0.07} className="mark-dot" />
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
    canvas.width = pattern.width * cell;
    canvas.height = pattern.height * cell;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawStitchPreview(ctx, pattern, cell, false);
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
  const [outline, setOutline] = useState(false);
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
    const maxW = Math.min(720, canvas.parentElement?.clientWidth || 720);
    const cell = Math.max(6, Math.floor(maxW / pattern.width));
    canvas.width = pattern.width * cell;
    canvas.height = pattern.height * cell;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawStitchPreview(ctx, pattern, cell, outline);
  }, [pattern, outline]);

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
    const cell = Math.max(10, Math.min(18, Math.floor(1600 / pattern.width)));
    const off = renderPatternToCanvas(pattern, cell, outline);
    off.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "puntopixel-pattern.png";
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  };

  const openPrint = () => {
    if (!pattern) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(printChartHtml(pattern, "PuntoPixel"));
    w.document.close();
  };

  const reset = () => {
    setSource(null);
    setPattern(null);
    setOutline(false);
    setLongSide(48);
    setColorCount(16);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openExample = (p: Pattern) => {
    setSource(null);
    setPattern(p);
    goStudio();
  };

  return (
    <div className="page">
      <header className="top">
        <a className="brand" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
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

          <label className="toggle">
            <input
              type="checkbox"
              checked={outline}
              onChange={(e) => setOutline(e.target.checked)}
            />
            <span>{t.outline}</span>
          </label>
        </div>

        <div className="actions">
          <button type="button" className="btn primary" disabled={!pattern} onClick={exportPng}>
            {t.exportPng}
          </button>
          <button type="button" className="btn ghost" disabled={!pattern} onClick={openPrint}>
            {t.print}
          </button>
          <button type="button" className="btn ghost" onClick={reset}>
            {t.reset}
          </button>
        </div>

        <div className={`preview-wrap ${busy ? "busy" : ""}`}>
          {pattern ? (
            <canvas ref={canvasRef} className="preview" aria-label={t.preview} />
          ) : (
            <p className="empty">{t.empty}</p>
          )}
        </div>

        {pattern && (
          <div className="legend">
            <h3>{t.legend}</h3>
            <ul>
              {pattern.palette.map((f, i) => (
                <li key={f.code + i}>
                  <span className="swatch" style={{ background: f.hex }} />
                  <span className="sym">{symbolFor(i)}</span>
                  <span className="code">
                    {t.dmc} {f.code}
                  </span>
                  <span className="name">{f.name}</span>
                  <span className="count">
                    {pattern.counts[i]} {t.stitchesUnit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <footer>
        <Mark size={22} />
        <span>PuntoPixel · MIT · Maria Contreras 2026</span>
      </footer>
    </div>
  );
}
