/** Re-exports blank-paint pattern APIs. */
export {
  createBlankPattern,
  type Pattern,
  type PreviewKind,
  type ImageSettings,
  type SampleMode,
  type SampleOptions,
  type CropMode,
  type FitMode,
  type BackgroundMode,
  type PaletteMode,
  colorDistance,
  buildAutoPalette,
  AIDA,
  AIDA_RGB,
  PAPER,
  PAPER_PINK,
  DIM_MIN,
  DIM_MAX,
  clampDim,
  sampleImage,
  pixelsToPattern,
  imageToPattern,
  ensureFloss,
  setCell,
  paintCell,
  medianCut,
} from "./pattern_core";
export {
  type CellHit,
  hitTestCell,
  loadImageFile,
  isUnusedFloss,
  contrastInk,
  tilePad,
  drawTilePreview,
  chartGutter,
  chartCanvasSize,
  drawChartPreview,
  renderPatternToCanvas,
} from "./pattern_draw";
export {
  exampleHeart,
  exampleFlower,
  exampleBird,
  EXAMPLES,
  printChartHtml,
} from "./pattern_examples";

export {
  cleanupPattern,
} from "./pattern_core";
export {
  fillRegion,
  pickFlossAt,
  applyPencil,
  PatternHistory,
} from "./editor_ops";
export {
  patternStats,
  estimateFlossMeters,
  exportPixelPng,
  downloadCanvasPng,
  exportPreviewPng,
  exportPatternPdf,
  PNG_SCALES,
} from "./pattern_export";
