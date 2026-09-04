# PuntoPixel

A friendly, browser-only pattern maker. Upload a photo, pick size and color count, and get a glossy tile mosaic plus a numbered bead chart. Export a PNG or open a printable instruction sheet.

**Live:** [punto-pixel-y51s.vercel.app](https://punto-pixel-y51s.vercel.app)

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

- Landing page with three built-in example motifs (heart, flower, bird) as glossy 3D tiles
- Studio: upload `image/*`, long side 32 / 48 / 64 / 80, 8 / 16 / 24 / 32 colors
- Median-cut quantization, then snap to a built-in DMC-like palette
- Two previews: TILES (glossy 3D tiles) and CHART (codes, numbered axes, orange guides every 10)
- Legend with code, color chip, name, and count
- Export PNG of the current preview and a printable bead chart

Spanish is the default language; toggle to English in the header.

## License

MIT © Maria Contreras 2026
