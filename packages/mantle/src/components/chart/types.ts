import type { Color } from "../../utils/color/index.js";
/**
 * Shared types for the internal canvas chart engine.
 *
 * This module is internal shared implementation — it is not exported from the
 * package. The public components built on it are `BarChart` (../bar-chart),
 * `LineChart` (../line-chart), `AreaChart` (../area-chart), and
 * `ScatterPlot` (../scatter-plot), mirroring how `dialog/primitive` backs
 * the dialog family.
 */

/**
 * The value of the x field in a chart datum: a category label, a number, or a
 * point in time.
 */
type XValue = string | number | Date;

/**
 * A single row of chart data — any object shape. Series read one numeric key
 * per row; the x key identifies the row's position on the x axis. Missing
 * keys and `null` values are rendered as gaps. Typed as `object` (not an
 * index signature) so interface-typed rows compose without ceremony; reads
 * happen through `datumValue` at the data boundary.
 */
type ChartDatum = object;

/**
 * How x values map onto the x axis:
 *
 * - `"band"` — categorical bands with air between them (bar charts).
 * - `"point"` — categorical positions with no band thickness (line/area over categories).
 * - `"linear"` — continuous numeric axis.
 * - `"time"` — continuous time axis with calendar-aware ticks.
 */
type XScaleKind = "band" | "point" | "linear" | "time";

/**
 * The x scale kinds a consumer may request on line/area charts. Bar charts are
 * always `"band"`.
 */
type ContinuousXScale = Exclude<XScaleKind, "band">;

/**
 * The mark a registered series paints.
 */
type SeriesMark = "bar" | "line" | "area" | "scatter";

/**
 * A series color: a mantle color name, the same `Color` that `Badge` takes, or
 * any CSS color string as an escape hatch.
 *
 * A name paints that color's chart token, `--color-chart-<name>`, which each
 * theme tunes to clear 3:1 contrast on the card surface. Functional names
 * (`success`, `danger`, …) alias the hue their status color uses. `neutral` is
 * the color for an "Other" series.
 *
 * A static CSS color (raw hex) cannot follow the two themes, so prefer a
 * `var(--your-token)` a consumer declares per theme. A series that carries
 * good/bad meaning (error rate, pass/fail) should wear a functional color.
 */
type SeriesColor = Color | (string & {});

/**
 * Line/area interpolation between points.
 */
type CurveKind = "linear" | "monotone" | "step";

/**
 * The glyph a series' points wear: scatter marks, line canvas markers, and
 * the hover dot on line/area charts. Shape is a redundant encoding alongside
 * color, so series stay distinguishable without color vision.
 *
 * A series that sets no `shape` wears the circle.
 *
 * What each added name draws:
 *
 * - `"triangle-down"` is the triangle mirrored.
 * - `"plus"` is a filled Greek cross.
 * - `"cross"` is that plus turned 45°.
 * - `"star"` is a filled five-pointed star.
 *
 * Every painted mark carries the circle's fill area, so no glyph reads louder
 * than its siblings. Legend keys and hover dots clip those same silhouettes
 * out of a small box instead, where a spiky glyph like the star reads lighter
 * than the square.
 */
type PointShape =
	| "circle"
	| "square"
	| "triangle"
	| "diamond"
	| "triangle-down"
	| "plus"
	| "cross"
	| "star";

/**
 * The fill texture a bar series wears: solid color (the default), diagonal
 * hatch lines at 45° (`"hatch"`), the 135° mirror (`"hatch-reverse"`), both
 * (`"crosshatch"`), rungs perpendicular to the bar's length
 * (`"perpendicular"` — horizontal lines on vertical bars), rungs parallel to
 * it (`"parallel"` — vertical lines on vertical bars), the orthogonal lattice
 * of both rung directions (`"grid"`), or an offset dot field (`"dots"`).
 *
 * The two rung textures flip with `orientation`, in opposite senses. Every
 * other value is direction-free, `"grid"` included — it is the orthogonal
 * lattice against `"crosshatch"`'s diagonal one.
 *
 * A textured series paints its marks in the full series color over a light
 * tint of it. Texture is a redundant identity encoding alongside color, so
 * grouped and stacked series stay distinguishable without color vision, in
 * grayscale print, and under forced colors. Two series can share one color and
 * stay apart by texture.
 */
type BarTexture =
	| "solid"
	| "hatch"
	| "hatch-reverse"
	| "crosshatch"
	| "perpendicular"
	| "parallel"
	| "grid"
	| "dots";

/**
 * The direction a bar chart's bars run: vertical columns rising from a bottom
 * baseline (the default), or horizontal bars growing rightward from a left
 * baseline — the layout for long category labels, which move into the left
 * gutter at full width instead of colliding under the plot.
 */
type BarOrientation = "vertical" | "horizontal";

/**
 * A registered series' configuration, captured from a series part
 * (`BarChart.Bar`, `LineChart.Line`, `AreaChart.Area`, `ScatterPlot.Point`).
 */
type SeriesSpec = {
	/** The row key this series reads its numeric values from. */
	dataKey: string;
	/** Display name for the legend, tooltip, and data table. Defaults to `dataKey`. */
	label: string;
	/** The color the series paints. */
	color: SeriesColor;
	/** The mark this series paints. */
	mark: SeriesMark;
	/** Interpolation for line/area marks. */
	curve: CurveKind;
	/** Draw point markers on line marks (auto-hidden past marker density). */
	markers: boolean;
	/** Join across `null`/missing values instead of leaving gaps. */
	connectNulls: boolean;
	/** The point glyph (scatter marks, line markers, hover dots). */
	shape: PointShape;
	/** The fill texture (bar marks only). */
	texture: BarTexture;
};

/**
 * A series with its resolved presentation, exposed to the legend, tooltip, and
 * data table.
 */
type SeriesMeta = {
	dataKey: string;
	label: string;
	mark: SeriesMark;
	/** The CSS color string the series paints with (a color name resolves to its chart token). */
	color: string;
	/** The color as authored (a color name or a CSS string) before resolution. */
	colorInput: SeriesColor;
	/**
	 * The point glyph the series wears (scatter marks, legend keys, hover
	 * dots). A bar paints no glyph; its legend key wears `texture` instead.
	 */
	shape: PointShape;
	/** The fill texture the series wears (bar marks and their legend keys). */
	texture: BarTexture;
};

/**
 * Grid line orientation.
 */
type GridLines = "horizontal" | "vertical" | "both";

/**
 * What an x-axis `tickFormat` receives beside the value.
 */
type XTickContext = {
	/** The label the axis paints when `tickFormat` is not set. */
	defaultLabel: string;
};

/**
 * What a y-axis `tickFormat` receives beside the value.
 */
type YTickContext = {
	/**
	 * The label the axis paints when `tickFormat` is not set. Its precision
	 * follows `step`, or the domain span when the axis has one tick.
	 */
	defaultLabel: string;
	/** The distance between adjacent ticks, or `0` when the axis has one tick. */
	step: number;
};

/**
 * Registered x-axis configuration. The formatter receives the chart's x
 * values: the category value on band/point scales, a `Date` on time scales,
 * and a number on linear scales.
 */
type XAxisSpec = {
	tickFormat: ((value: XValue, context: XTickContext) => string) | undefined;
	tickCount: number | undefined;
};

/**
 * Registered y-axis configuration.
 */
type YAxisSpec = {
	tickFormat: ((value: number, context: YTickContext) => string) | undefined;
	tickCount: number | undefined;
};

/**
 * Registered reference line configuration.
 */
type ReferenceLineSpec = {
	y: number;
	label: string | undefined;
	color: SeriesColor | undefined;
};

/**
 * The hover/keyboard snapshot published by the engine. One snapshot describes
 * the active x position and every series' value at it — the tooltip, the
 * aria-live announcement, and `onDatumActivate` all read from it.
 */
type HoverSnapshot = {
	/** The active row's index in the consumer's `data` array. */
	index: number;
	/** The x value at the active index. */
	xValue: XValue;
	/** The original consumer datum at the active index. */
	datum: ChartDatum;
	/**
	 * Every registered series' value at the active index. Stacked, the order runs
	 * from the far end of the stack back to the baseline, so the rows match the
	 * stack a reader sees. Unstacked, the order is the paint order the series
	 * registered in.
	 */
	points: Array<{
		dataKey: string;
		label: string;
		/** `null` renders as a gap (an em dash in the tooltip). */
		value: number | null;
		color: string;
	}>;
	/**
	 * The sum of every series' value at the active index. Set only on a stacked
	 * chart with two or more series, where the tooltip leads with it.
	 */
	total?: number;
	/** The depth value at the active index (3D scatter plots only). */
	zValue?: number | null;
	/** Whether the snapshot came from keyboard stepping (vs pointer hover). */
	viaKeyboard: boolean;
};

/**
 * Payload for datum activation (click / Enter / Space).
 */
type ChartDatumEvent<TDatum extends ChartDatum = ChartDatum> = {
	/** The activated row's index in the consumer's `data` array. */
	index: number;
	/** The x value of the activated row. */
	xValue: XValue;
	/** The activated row itself. */
	datum: TDatum;
	/**
	 * The series the pointer selects when activated by mouse; `null` for
	 * keyboard/whole-band activation. A stacked bar resolves to the segment the
	 * pointer sits in, because the mark is the filled span. Every other mark
	 * resolves to the series nearest the pointer.
	 */
	dataKey: string | null;
};

/**
 * The y domain for value axes. Bar and area charts anchor the baseline at
 * zero, so their minimum is fixed at `0`; line charts may override both ends.
 */
type YDomain = [number | "auto", number | "auto"];

/**
 * Everything the engine needs that comes from Root props (as opposed to
 * registered parts).
 */
type ChartOptions = {
	xKey: string;
	xScale: XScaleKind;
	yDomain: YDomain;
	/** Bar charts only: the direction the bars run. */
	orientation: BarOrientation;
	/** Scatter plots only: the row key of the depth value; enables the 3D projection. */
	zKey: string | null;
	/**
	 * 3D scatter only: how many axes the cloud currently occupies. Changing it
	 * morphs points onto the x axis line (1), the xy plane (2), or the full
	 * cube (3) — the collapse glides via the same chase as the domains.
	 */
	dimensions: 1 | 2 | 3;
	stacked: boolean;
	animate: boolean;
};

export type {
	//,
	BarOrientation,
	BarTexture,
	ChartDatum,
	ChartDatumEvent,
	ChartOptions,
	ContinuousXScale,
	CurveKind,
	GridLines,
	HoverSnapshot,
	PointShape,
	ReferenceLineSpec,
	SeriesColor,
	SeriesMark,
	SeriesMeta,
	SeriesSpec,
	XAxisSpec,
	XScaleKind,
	XTickContext,
	XValue,
	YAxisSpec,
	YDomain,
	YTickContext,
};
