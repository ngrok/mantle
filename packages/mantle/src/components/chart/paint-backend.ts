import type { ChartChromeColors } from "./colors.js";
import type { BarOrientation, SeriesColor, SeriesMeta } from "./types.js";

/**
 * The seam between the chart engine and the surface it paints on. The engine
 * computes every mark's geometry once and draws it through a
 * {@link PaintContext}. A backend owns the surface element and turns those
 * draw calls into pixels: the canvas backend rasterizes them, and the SVG
 * backend records them into one `<path>` per style run.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/**
 * The 2D drawing calls the renderer makes. A `CanvasRenderingContext2D`
 * satisfies it, and so does the SVG backend's recorder.
 */
type PaintContext = {
	/** A color string, or the SVG backend's `url(#…)` texture reference. */
	fillStyle: string | CanvasGradient | CanvasPattern;
	strokeStyle: string | CanvasGradient | CanvasPattern;
	lineWidth: number;
	globalAlpha: number;
	lineJoin: CanvasLineJoin;
	lineCap: CanvasLineCap;
	font: string;
	textAlign: CanvasTextAlign;
	textBaseline: CanvasTextBaseline;
	save(): void;
	restore(): void;
	beginPath(): void;
	closePath(): void;
	moveTo(x: number, y: number): void;
	lineTo(x: number, y: number): void;
	bezierCurveTo(
		control1X: number,
		control1Y: number,
		control2X: number,
		control2Y: number,
		x: number,
		y: number,
	): void;
	rect(x: number, y: number, width: number, height: number): void;
	roundRect(x: number, y: number, width: number, height: number, radii: number[]): void;
	arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
	fill(): void;
	stroke(): void;
	fillRect(x: number, y: number, width: number, height: number): void;
	clip(): void;
	setLineDash(segments: number[]): void;
	fillText(text: string, x: number, y: number): void;
	measureText(text: string): { width: number };
};

/** The left-edge scroll mask of a streaming chart, in CSS pixels. */
type EdgeFade = {
	left: number;
	top: number;
	width: number;
	height: number;
	/** How strongly the marks fade at the plot's left edge, from 0 to 1. */
	alpha: number;
};

/** The colors and fills one paint pass draws with. */
type ResolvedPaint = {
	/** The backend's cache key for this pass; a new key resolves again. */
	signature: string;
	/** The paint color of each series, by `dataKey`. */
	series: Map<string, string>;
	/** The color and texture inputs each series resolved from, so a change resolves again. */
	inputs: Map<string, string>;
	/** The fill of each textured bar series. A series with no entry fills solid. */
	barFills: Map<string, string>;
	chrome: ChartChromeColors;
	/** The font family the axis labels measure and draw with, read on first call. */
	fontFamily: () => string;
	/** Resolve one more color in this pass, such as a reference line's. */
	resolve: (color: SeriesColor) => string;
};

type PaintBackend = {
	/** Which surface the backend paints. */
	kind: "canvas" | "svg";
	/** The surface element. The Root inserts it into the plot, under the overlay. */
	element: Element;
	/**
	 * The cache key of the current colors. The engine resolves again when it
	 * differs from the last {@link ResolvedPaint.signature}.
	 */
	paintSignature(options: { devicePixelRatio: number; orientation: BarOrientation }): string;
	/** Resolve the colors and fills for one pass; `null` when the document has no window. */
	resolvePaint(options: {
		series: readonly SeriesMeta[];
		devicePixelRatio: number;
		orientation: BarOrientation;
		signature: string;
	}): ResolvedPaint | null;
	/** A context that measures text outside a frame, or `null` when the surface cannot paint. */
	measureContext(): PaintContext | null;
	/** Start a frame at this size. Returns `null` when the surface cannot paint. */
	begin(options: {
		cssWidth: number;
		cssHeight: number;
		devicePixelRatio: number;
	}): PaintContext | null;
	/**
	 * Paint the grid under the marks, then the marks. With `fade` set, the
	 * marks fade out through a band at the plot's left edge and the grid does
	 * not.
	 */
	composite(
		context: PaintContext,
		layers: { underlay: () => void; marks: () => void; fade: EdgeFade | null },
	): void;
	/** Finish the frame. The SVG backend writes its recorded paths here. */
	end(): void;
	/** Free the surface's memory for a chart far from the viewport. The next frame paints in full. */
	release(): void;
	destroy(): void;
};

/** What a backend factory receives from the Root. */
type PaintBackendOptions = {
	/** The chart Root, whose cascade the colors resolve in. */
	root: HTMLElement;
	/** The plot wrapper the surface fills. */
	plot: HTMLElement;
	/** The Root's slot name, such as `"bar-chart"`, for the surface's `data-slot`. */
	slotName: string;
	/** Report a theme change outside the chart that changes the resolved colors. */
	onColorsChange: () => void;
};

/** Builds the paint backend of one chart at activation. */
type PaintBackendFactory = {
	(options: PaintBackendOptions): PaintBackend;
	/**
	 * Which surface the factory builds. The Root reads it before a backend
	 * exists: a dormant chart must know whether its surface holds a bitmap.
	 */
	kind: PaintBackend["kind"];
};

export type {
	//,
	EdgeFade,
	PaintBackend,
	PaintBackendFactory,
	PaintBackendOptions,
	PaintContext,
	ResolvedPaint,
};
