/**
 * Shared types for the internal canvas chart engine.
 *
 * This module is internal shared implementation — it is not exported from the
 * package. The public components built on it are `BarChart` (../bar-chart),
 * `LineChart` (../line-chart), `AreaChart` (../area-chart), and
 * `ScatterChart` (../scatter-chart), mirroring how `dialog/primitive` backs
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
 * The ordered chart color tokens. Slots are assigned to series in registration
 * order and stick to their `dataKey` for the chart's lifetime; series past the
 * eighth slot use `"chart-other"`.
 */
type ChartColorToken =
	| "chart-1"
	| "chart-2"
	| "chart-3"
	| "chart-4"
	| "chart-5"
	| "chart-6"
	| "chart-7"
	| "chart-8"
	| "chart-other";

/**
 * A series color: one of the validated chart tokens (preferred — they adapt to
 * light/dark/high-contrast themes) or any CSS color string as an escape hatch.
 * Static colors (e.g. raw hex) do not adapt across themes; custom palettes
 * must be validated for colorblind-safe adjacency and surface contrast. A
 * series that carries good/bad meaning (error rate, pass/fail) should wear the
 * semantic status colors, never a categorical chart slot.
 */
type SeriesColor = ChartColorToken | (string & {});

/**
 * Line/area interpolation between points.
 */
type CurveKind = "linear" | "monotone" | "step";

/**
 * A registered series' configuration, captured from a series part
 * (`BarChart.Bar`, `LineChart.Line`, `AreaChart.Area`).
 */
type SeriesSpec = {
	/** The row key this series reads its numeric values from. */
	dataKey: string;
	/** Display name for the legend, tooltip, and data table. Defaults to `dataKey`. */
	label: string;
	/** Explicit color; when omitted the series claims the next sticky slot. */
	color: SeriesColor | undefined;
	/** The mark this series paints. */
	mark: SeriesMark;
	/** Interpolation for line/area marks. */
	curve: CurveKind;
	/** Draw point markers on line marks (auto-hidden past marker density). */
	markers: boolean;
	/** Join across `null`/missing values instead of leaving gaps. */
	connectNulls: boolean;
};

/**
 * A series with its resolved presentation, exposed to the legend, tooltip, and
 * data table.
 */
type SeriesMeta = {
	dataKey: string;
	label: string;
	mark: SeriesMark;
	/** The CSS color string the series paints with (token-resolved). */
	color: string;
	/** The color as authored (token name or custom string) before resolution. */
	colorInput: SeriesColor;
};

/**
 * Grid line orientation.
 */
type GridLines = "horizontal" | "vertical" | "both";

/**
 * Registered x-axis configuration. The formatter receives the chart's x
 * values: the category value on band/point scales, a `Date` on time scales,
 * and a number on linear scales.
 */
type XAxisSpec = {
	tickFormat: ((value: XValue) => string) | undefined;
	tickCount: number | undefined;
};

/**
 * Registered y-axis configuration.
 */
type YAxisSpec = {
	tickFormat: ((value: number) => string) | undefined;
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
	/** Index into the (sorted) data rows. */
	index: number;
	/** The x value at the active index. */
	xValue: XValue;
	/** The original consumer datum at the active index. */
	datum: ChartDatum;
	/** Every registered series' value at the active index, in visual order. */
	points: Array<{
		dataKey: string;
		label: string;
		/** `null` renders as a gap (an em dash in the tooltip). */
		value: number | null;
		color: string;
	}>;
	/** The depth value at the active index (3D scatter charts only). */
	zValue?: number | null;
	/** Whether the snapshot came from keyboard stepping (vs pointer hover). */
	viaKeyboard: boolean;
};

/**
 * Payload for datum activation (click / Enter / Space).
 */
type ChartDatumEvent<TDatum extends ChartDatum = ChartDatum> = {
	index: number;
	xValue: XValue;
	datum: TDatum;
	/** The series nearest the pointer when activated by mouse; `null` for keyboard/whole-band activation. */
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
	/** Scatter charts only: the row key of the depth value; enables the 3D projection. */
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
	ChartColorToken,
	ChartDatum,
	ChartDatumEvent,
	ChartOptions,
	ContinuousXScale,
	CurveKind,
	GridLines,
	HoverSnapshot,
	ReferenceLineSpec,
	SeriesColor,
	SeriesMark,
	SeriesMeta,
	SeriesSpec,
	XAxisSpec,
	XScaleKind,
	XValue,
	YAxisSpec,
	YDomain,
};
