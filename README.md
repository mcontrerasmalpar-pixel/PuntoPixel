# PuntoPixel

A friendly, browser-only pattern maker. Upload a photo, pick **width and height** independently, and get a glossy tile mosaic plus a numbered bead chart — or start from a **blank template** and paint cells by hand. Export a PNG or open a printable instruction sheet.

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
- Studio: upload `image/*`, or **Plantilla vacía** for an empty AIDA grid
- Independent **Ancho** / **Alto** (8–80 each) with presets + number inputs
- Photo mode still supports 8 / 16 / 24 / 32 color quantization
- Median-cut quantization, then snap to a built-in DMC-like palette
- Two previews: TILES (glossy 3D tiles) and CHART (codes, numbered axes, orange guides every 10)
- Paint / erase tools: pick a floss, tap or drag cells (touch-friendly); highlight still works for review
- Legend with code, color chip, name, and count
- Export PNG of the current preview and a printable bead chart

Spanish is the default language; toggle to English in the header.

## License

MIT © Maria Contreras 2026
