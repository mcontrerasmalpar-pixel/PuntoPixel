export type CropMode = "original" | "square" | "custom";
export type FitMode = "contain" | "cover";
type RGBFill = [number, number, number];

export type CropRect = {
  /** Source x (0–1 normalized or absolute px; we use absolute). */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

export type CropOptions = {
  crop?: CropMode;
  fit?: FitMode;
  /** Only used when crop === "custom". Absolute pixels in source space. */
  custom?: { x: number; y: number; w: number; h: number };
  /** Target aspect (width/height). Used for square or cover/contain. */
  targetAspect?: number;
};

/**
 * Compute the source rectangle to sample from so that a vertical photo
 * is not stretched into a square (or any non-matching aspect).
 *
 * - original: use the whole image (may distort if target aspect differs)
 * - square: center-crop to 1:1
 * - custom: user rect
 * - fit contain: letterbox (keep full image, empty areas later filled)
 * - fit cover: crop to fill target aspect (no empty areas)
 */
export function computeCropRect(
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  options: CropOptions = {},
): CropRect {
  const crop = options.crop ?? "original";
  const fit = options.fit ?? "cover";
  const targetAspect =
    options.targetAspect ?? (targetW > 0 && targetH > 0 ? targetW / targetH : 1);

  if (crop === "custom" && options.custom) {
    const { x, y, w, h } = options.custom;
    return {
      sx: Math.max(0, x),
      sy: Math.max(0, y),
      sw: Math.min(srcW - Math.max(0, x), Math.max(1, w)),
      sh: Math.min(srcH - Math.max(0, y), Math.max(1, h)),
    };
  }

  if (crop === "square") {
    const side = Math.min(srcW, srcH);
    return {
      sx: (srcW - side) / 2,
      sy: (srcH - side) / 2,
      sw: side,
      sh: side,
    };
  }

  // original + fit
  const srcAspect = srcW / srcH;

  if (fit === "contain") {
    // Use full image; sampling will letterbox later if needed.
    return { sx: 0, sy: 0, sw: srcW, sh: srcH };
  }

  // cover: crop source so aspect matches target
  if (srcAspect > targetAspect) {
    // source wider → crop sides
    const sw = srcH * targetAspect;
    return {
      sx: (srcW - sw) / 2,
      sy: 0,
      sw,
      sh: srcH,
    };
  }
  // source taller → crop top/bottom
  const sh = srcW / targetAspect;
  return {
    sx: 0,
    sy: (srcH - sh) / 2,
    sw: srcW,
    sh,
  };
}

/**
 * Draw source into a canvas of size (targetW × targetH) applying crop + fit.
 * Returns the canvas (caller can then sample from it).
 */
export function applyCropFit(
  img: HTMLImageElement | HTMLCanvasElement,
  targetW: number,
  targetH: number,
  options: CropOptions = {},
  background: "original" | "remove" | "transparent" | RGBFill = "original",
): HTMLCanvasElement {
  const srcW =
    "naturalWidth" in img && img.naturalWidth ? img.naturalWidth : img.width;
  const srcH =
    "naturalHeight" in img && img.naturalHeight
      ? img.naturalHeight
      : img.height;

  const rect = computeCropRect(srcW, srcH, targetW, targetH, options);
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D not available");

  // Background
  if (background === "transparent" || background === "remove") {
    ctx.clearRect(0, 0, targetW, targetH);
  } else if (Array.isArray(background)) {
    ctx.fillStyle = `rgb(${background[0]},${background[1]},${background[2]})`;
    ctx.fillRect(0, 0, targetW, targetH);
  } else {
    // original: no fill (drawImage will cover); for contain we need fill
    ctx.fillStyle = "#F3E6C9"; // AIDA-ish fallback for letterbox
    ctx.fillRect(0, 0, targetW, targetH);
  }

  const fit = options.fit ?? "cover";
  if (fit === "contain" && (options.crop ?? "original") === "original") {
    // letterbox: scale to fit inside target
    const scale = Math.min(targetW / srcW, targetH / srcH);
    const dw = srcW * scale;
    const dh = srcH * scale;
    const dx = (targetW - dw) / 2;
    const dy = (targetH - dh) / 2;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, srcW, srcH, dx, dy, dw, dh);
  } else {
    // cover / square / custom: draw the crop rect stretched to full target
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      img,
      rect.sx,
      rect.sy,
      rect.sw,
      rect.sh,
      0,
      0,
      targetW,
      targetH,
    );
  }

  return canvas;
}
