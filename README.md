# PuntoPixel

A friendly, browser-only cross-stitch pattern maker. Upload a photo, pick stitch size and color count, and get an X-stitch preview on cream aida cloth with a DMC-like floss legend. Export a PNG or open a printable symbol chart.

PuntoPixel is a small client-side app — no backend, no accounts.

## Run locally

```bash
npm i && npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Build

```bash
npm run build
```

Preview the production build with `npm run preview`.

## What it does

- Landing page with three built-in example motifs (heart, flower, bird)
- Studio: upload `image/*`, long side 32 / 48 / 64 / 80 stitches, 8 / 16 / 24 / 32 colors
- Median-cut quantization, then snap to a built-in DMC-like palette
- Canvas preview drawn as X stitches (not flat pixels), optional outline
- Legend with swatch, DMC code, name, and stitch count
- Export PNG of the preview and a printable chart with symbols

Spanish is the default language; toggle to English in the header.

## License

MIT © Maria Contreras 2026
