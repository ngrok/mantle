import type { ChartRenderer, PaintBackendFactory, PaintBackendSource } from "./paint-backend.js";
import { createSvgBackend } from "./svg-backend.js";

/**
 * The paint backend sources of the Bar, Line, and Area charts. The SVG backend
 * ships in the chart's own chunk. The canvas backend loads through a dynamic
 * import, so a page that never sets `renderer="canvas"` never downloads it.
 *
 * This module is internal shared implementation — not exported from the package.
 */

const loadCanvasBackend = async (): Promise<PaintBackendFactory> =>
	(await import("./canvas-backend.js")).createCanvasBackend;

const SVG_SOURCE: PaintBackendSource = { factory: createSvgBackend };
const CANVAS_SOURCE: PaintBackendSource = { load: loadCanvasBackend };

/**
 * The backend source for a `renderer` prop. Each value returns one stable
 * object, so a Root re-renders without rebuilding its engine.
 *
 * @example
 * ```tsx
 * <ChartRootPrimitive paintBackend={paintBackendSource(renderer)} … />
 * ```
 */
const paintBackendSource = (renderer: ChartRenderer): PaintBackendSource =>
	renderer === "canvas" ? CANVAS_SOURCE : SVG_SOURCE;

export {
	//,
	paintBackendSource,
};
